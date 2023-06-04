import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { assert } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import {
    createDefaultExportExpression,
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

function transformExportAll(context: TransformationContext, node: ts.ExportDeclaration): lua.Statement | undefined {
    assert(node.moduleSpecifier);

    if (!context.resolver.moduleExportsSomeValue(node.moduleSpecifier)) {
        return undefined;
    }

    const moduleRequire = createModuleRequire(context, node.moduleSpecifier);

    // export * as ns from "...";
    // exports.ns = require(...)
    if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
        const assignToExports = lua.createAssignmentStatement(
            lua.createTableIndexExpression(
                createExportsIdentifier(),
                lua.createStringLiteral(node.exportClause.name.text)
            ),
            moduleRequire
        );
        return assignToExports;
    }

    // export * from "...";
    // exports all values EXCEPT "default" from "..."
    const result: lua.Statement[] = [];

    // local ____export = require(...)
    const tempModuleIdentifier = lua.createIdentifier("____export");
    const declaration = lua.createVariableDeclarationStatement(tempModuleIdentifier, moduleRequire);
    result.push(declaration);

    // ____exports[____exportKey] = ____exportValue
    const forKey = lua.createIdentifier("____exportKey");
    const forValue = lua.createIdentifier("____exportValue");
    const leftAssignment = lua.createAssignmentStatement(
        lua.createTableIndexExpression(createExportsIdentifier(), forKey),
        forValue
    );

    // if key ~= "default" then
    //  -- export the value, do not export "default" values
    // end
    const ifBody = lua.createBlock([leftAssignment]);
    const ifStatement = lua.createIfStatement(
        lua.createBinaryExpression(
            lua.cloneIdentifier(forKey),
            lua.createStringLiteral("default"),
            lua.SyntaxKind.InequalityOperator
        ),
        ifBody
    );

    // for ____exportKey, ____exportValue in ____export do
    //  -- export ____exportValue, unless ____exportKey is "default"
    // end
    const pairsIdentifier = lua.createIdentifier("pairs");
    const forIn = lua.createForInStatement(
        lua.createBlock([ifStatement]),
        [lua.cloneIdentifier(forKey), lua.cloneIdentifier(forValue)],
        [lua.createCallExpression(pairsIdentifier, [lua.cloneIdentifier(tempModuleIdentifier)])]
    );

    result.push(forIn);

    // Wrap this in a DoStatement to prevent polluting the scope.
    return lua.createDoStatement(result, node);
}

const isDefaultExportSpecifier = (node: ts.ExportSpecifier) =>
    (node.name && ts.identifierToKeywordKind(node.name) === ts.SyntaxKind.DefaultKeyword) ||
    (node.propertyName && ts.identifierToKeywordKind(node.propertyName) === ts.SyntaxKind.DefaultKeyword);

function transformExportSpecifier(context: TransformationContext, node: ts.ExportSpecifier): lua.AssignmentStatement {
    const exportedSymbol = context.checker.getExportSpecifierLocalTargetSymbol(node);
    const exportedIdentifier = node.propertyName ? node.propertyName : node.name;
    const exportedExpression = createShorthandIdentifier(context, exportedSymbol, exportedIdentifier);

    const isDefault = isDefaultExportSpecifier(node);
    const exportAssignmentLeftHandSide = isDefault
        ? createDefaultExportExpression(node)
        : createExportedIdentifier(context, transformIdentifier(context, node.name));

    return lua.createAssignmentStatement(exportAssignmentLeftHandSide, exportedExpression, node);
}

function transformExportSpecifiersFrom(
    context: TransformationContext,
    statement: ts.ExportDeclaration,
    moduleSpecifier: ts.Expression,
    exportSpecifiers: ts.ExportSpecifier[]
): lua.Statement {
    // First transpile as import clause
    const importClause = ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamedImports(
            exportSpecifiers.map(s => ts.factory.createImportSpecifier(statement.isTypeOnly, s.propertyName, s.name))
        )
    );

    const importDeclaration = ts.factory.createImportDeclaration(statement.modifiers, importClause, moduleSpecifier);

    // Wrap in block to prevent imports from hoisting out of `do` statement
    const [block] = transformScopeBlock(context, ts.factory.createBlock([importDeclaration]), ScopeType.Block);
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
        return transformExportAll(context, node);
    }

    if (!context.resolver.isValueAliasDeclaration(node)) {
        return undefined;
    }

    if (ts.isNamespaceExport(node.exportClause)) {
        // export * as ns from "...";
        return transformExportAll(context, node);
    }

    const exportSpecifiers = getExported(context, node.exportClause);

    // export { ... };
    if (!node.moduleSpecifier) {
        return exportSpecifiers.map(exportSpecifier => transformExportSpecifier(context, exportSpecifier));
    }

    // export { ... } from "...";
    return transformExportSpecifiersFrom(context, node, node.moduleSpecifier, exportSpecifiers);
};
