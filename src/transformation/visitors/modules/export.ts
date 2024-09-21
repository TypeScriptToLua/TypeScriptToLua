import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { assert } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { createDefaultExportExpression, createDefaultExportStringLiteral } from "../../utils/export";
import { createExportsIdentifier } from "../../utils/lua-ast";
import { createShorthandIdentifier, transformPropertyName } from "../literal";
import { createModuleRequire } from "./import";
import { createSafeName } from "../../utils/safe-names";
import * as path from "path";

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
    (node.name &&
        ts.isIdentifier(node.name) &&
        ts.identifierToKeywordKind(node.name) === ts.SyntaxKind.DefaultKeyword) ||
    (node.propertyName &&
        ts.isIdentifier(node.propertyName) &&
        ts.identifierToKeywordKind(node.propertyName) === ts.SyntaxKind.DefaultKeyword);

function transformExportSpecifier(context: TransformationContext, node: ts.ExportSpecifier): lua.AssignmentStatement {
    const exportedName = node.name;
    const exportedValue = node.propertyName ?? node.name;
    let rhs: lua.Expression;
    if (ts.isIdentifier(exportedValue)) {
        const exportedSymbol = context.checker.getExportSpecifierLocalTargetSymbol(node);
        rhs = createShorthandIdentifier(context, exportedSymbol, exportedValue);
    } else {
        rhs = lua.createStringLiteral(exportedName.text, exportedValue);
    }

    if (isDefaultExportSpecifier(node)) {
        const lhs = createDefaultExportExpression(node);
        return lua.createAssignmentStatement(lhs, rhs, node);
    } else {
        const exportsTable = createExportsIdentifier();
        const lhs = lua.createTableIndexExpression(
            exportsTable,
            lua.createStringLiteral(exportedName.text),
            exportedName
        );

        return lua.createAssignmentStatement(lhs, rhs, node);
    }
}

function transformExportSpecifiersFrom(
    context: TransformationContext,
    statement: ts.ExportDeclaration,
    moduleSpecifier: ts.Expression,
    exportSpecifiers: ts.ExportSpecifier[]
): lua.Statement {
    const result: lua.Statement[] = [];

    const importPath = ts.isStringLiteral(moduleSpecifier) ? moduleSpecifier.text.replace(/"/g, "") : "module";

    // Create the require statement to extract values.
    // local ____module = require("module")
    const importUniqueName = lua.createIdentifier(createSafeName(path.basename(importPath)));
    const requireCall = createModuleRequire(context, moduleSpecifier);
    result.push(lua.createVariableDeclarationStatement(importUniqueName, requireCall, statement));

    for (const specifier of exportSpecifiers) {
        // Assign to exports table
        const exportsTable = createExportsIdentifier();
        const exportedName = specifier.name;
        const exportedNameTransformed = transformPropertyName(context, exportedName);
        const lhs = lua.createTableIndexExpression(exportsTable, exportedNameTransformed, exportedName);

        const exportedValue = specifier.propertyName ?? specifier.name;
        const rhs = lua.createTableIndexExpression(
            lua.cloneIdentifier(importUniqueName),
            transformPropertyName(context, exportedValue),
            specifier
        );
        result.push(lua.createAssignmentStatement(lhs, rhs, specifier));
    }

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
