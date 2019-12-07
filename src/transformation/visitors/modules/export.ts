import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { InvalidExportDeclaration } from "../../utils/errors";
import {
    createDefaultExportIdentifier,
    createDefaultExportStringLiteral,
    createExportedIdentifier,
} from "../../utils/export";
import { createExportsIdentifier } from "../../utils/lua-ast";
import { ScopeType } from "../../utils/scope";
import { transformScopeBlock } from "../block";
import { transformIdentifier } from "../identifier";
import { createShorthandIdentifier } from "../literal";
import { createModuleRequire } from "./import";

export const transformExportAssignment: FunctionVisitor<ts.ExportAssignment> = (node, context) => {
    if (!context.resolver.isValueAliasDeclaration(node)) {
        return undefined;
    }

    const exportedValue = context.transformExpression(node.expression);

    // export = [expression];
    // ____exports = [expression];
    if (node.isExportEquals) {
        return lua.createVariableDeclarationStatement(createExportsIdentifier(), exportedValue, node);
    } else {
        // export default [expression];
        // ____exports.default = [expression];
        return lua.createAssignmentStatement(
            lua.createTableIndexExpression(createExportsIdentifier(), createDefaultExportStringLiteral(node)),
            exportedValue,
            node
        );
    }
};

function transformExportAllFrom(context: TransformationContext, node: ts.ExportDeclaration): lua.Statement | undefined {
    if (node.moduleSpecifier === undefined) {
        throw InvalidExportDeclaration(node);
    }

    if (!context.resolver.moduleExportsSomeValue(node.moduleSpecifier)) {
        return undefined;
    }

    const moduleRequire = createModuleRequire(context, node.moduleSpecifier);
    const tempModuleIdentifier = lua.createIdentifier("____export");

    const declaration = lua.createVariableDeclarationStatement(tempModuleIdentifier, moduleRequire);

    const forKey = lua.createIdentifier("____exportKey");
    const forValue = lua.createIdentifier("____exportValue");

    const body = lua.createBlock([
        lua.createAssignmentStatement(lua.createTableIndexExpression(createExportsIdentifier(), forKey), forValue),
    ]);

    const pairsIdentifier = lua.createIdentifier("pairs");
    const forIn = lua.createForInStatement(
        body,
        [lua.cloneIdentifier(forKey), lua.cloneIdentifier(forValue)],
        [lua.createCallExpression(pairsIdentifier, [lua.cloneIdentifier(tempModuleIdentifier)])]
    );

    // Wrap this in a DoStatement to prevent polluting the scope.
    return lua.createDoStatement([declaration, forIn], node);
}

const isDefaultExportSpecifier = (node: ts.ExportSpecifier) =>
    (node.name && node.name.originalKeywordKind === ts.SyntaxKind.DefaultKeyword) ||
    (node.propertyName && node.propertyName.originalKeywordKind === ts.SyntaxKind.DefaultKeyword);

function transformExportSpecifier(context: TransformationContext, node: ts.ExportSpecifier): lua.AssignmentStatement {
    const exportedSymbol = context.checker.getExportSpecifierLocalTargetSymbol(node);
    const exportedIdentifier = node.propertyName ? node.propertyName : node.name;
    const exportedExpression = createShorthandIdentifier(context, exportedSymbol, exportedIdentifier);

    const isDefault = isDefaultExportSpecifier(node);
    const identifierToExport = isDefault
        ? createDefaultExportIdentifier(node)
        : transformIdentifier(context, node.name);
    const exportAssignmentLeftHandSide = createExportedIdentifier(context, identifierToExport);

    return lua.createAssignmentStatement(exportAssignmentLeftHandSide, exportedExpression, node);
}

function transformExportSpecifiersFrom(
    context: TransformationContext,
    statement: ts.ExportDeclaration,
    moduleSpecifier: ts.Expression,
    exportSpecifiers: ts.ExportSpecifier[]
): lua.Statement {
    // First transpile as import clause
    const importClause = ts.createImportClause(
        undefined,
        ts.createNamedImports(exportSpecifiers.map(s => ts.createImportSpecifier(s.propertyName, s.name)))
    );

    const importDeclaration = ts.createImportDeclaration(
        statement.decorators,
        statement.modifiers,
        importClause,
        moduleSpecifier
    );

    // Wrap in block to prevent imports from hoisting out of `do` statement
    const [block] = transformScopeBlock(context, ts.createBlock([importDeclaration]), ScopeType.Block);
    const result = block.statements;

    // Now the module is imported, add the imports to the export table
    for (const specifier of exportSpecifiers) {
        result.push(
            lua.createAssignmentStatement(
                createExportedIdentifier(context, transformIdentifier(context, specifier.name)),
                transformIdentifier(context, specifier.name)
            )
        );
    }

    // Wrap this in a DoStatement to prevent polluting the scope.
    return lua.createDoStatement(result, statement);
}

export const getExported = (context: TransformationContext, exportSpecifiers: ts.NamedExports) =>
    exportSpecifiers.elements.filter(exportSpecifier => context.resolver.isValueAliasDeclaration(exportSpecifier));

export const transformExportDeclaration: FunctionVisitor<ts.ExportDeclaration> = (node, context) => {
    if (!node.exportClause) {
        // export * from "...";
        return transformExportAllFrom(context, node);
    }

    if (!context.resolver.isValueAliasDeclaration(node)) {
        return undefined;
    }

    const exportSpecifiers = getExported(context, node.exportClause);

    // export { ... };
    if (!node.moduleSpecifier) {
        return exportSpecifiers.map(exportSpecifier => transformExportSpecifier(context, exportSpecifier));
    }

    // export { ... } from "...";
    return transformExportSpecifiersFrom(context, node, node.moduleSpecifier, exportSpecifiers);
};
