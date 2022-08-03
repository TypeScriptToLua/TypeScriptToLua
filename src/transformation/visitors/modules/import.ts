import * as path from "path";
import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { createStaticPromiseFunctionAccessor } from "../../builtins/promise";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getSymbolAnnotations } from "../../utils/annotations";
import { createDefaultExportStringLiteral } from "../../utils/export";
import { createHoistableVariableDeclarationStatement } from "../../utils/lua-ast";
import { importLuaLibFeature, LuaLibFeature } from "../../utils/lualib";
import { createSafeName } from "../../utils/safe-names";
import { peekScope } from "../../utils/scope";
import { transformIdentifier } from "../identifier";
import { transformPropertyName } from "../literal";

function isNoResolutionPath(context: TransformationContext, moduleSpecifier: ts.Expression): boolean {
    const moduleOwnerSymbol = context.checker.getSymbolAtLocation(moduleSpecifier);
    if (!moduleOwnerSymbol) return false;

    const annotations = getSymbolAnnotations(moduleOwnerSymbol);
    return annotations.has(AnnotationKind.NoResolution);
}

export function createModuleRequire(
    context: TransformationContext,
    moduleSpecifier: ts.Expression,
    tsOriginal: ts.Node = moduleSpecifier
): lua.CallExpression {
    const params: lua.Expression[] = [];
    if (ts.isStringLiteral(moduleSpecifier)) {
        const modulePath = isNoResolutionPath(context, moduleSpecifier)
            ? `@NoResolution:${moduleSpecifier.text}`
            : moduleSpecifier.text;

        params.push(lua.createStringLiteral(modulePath));
    }

    return lua.createCallExpression(lua.createIdentifier("require"), params, tsOriginal);
}

function shouldBeImported(context: TransformationContext, importNode: ts.ImportClause | ts.ImportSpecifier): boolean {
    return context.resolver.isReferencedAliasDeclaration(importNode);
}

function transformImportSpecifier(
    context: TransformationContext,
    importSpecifier: ts.ImportSpecifier,
    moduleTableName: lua.Identifier
): lua.VariableDeclarationStatement {
    const leftIdentifier = transformIdentifier(context, importSpecifier.name);
    const propertyName = transformPropertyName(
        context,
        importSpecifier.propertyName ? importSpecifier.propertyName : importSpecifier.name
    );

    return lua.createVariableDeclarationStatement(
        leftIdentifier,
        lua.createTableIndexExpression(moduleTableName, propertyName),
        importSpecifier
    );
}

export const transformImportDeclaration: FunctionVisitor<ts.ImportDeclaration> = (statement, context) => {
    const scope = peekScope(context);

    if (!scope.importStatements) {
        scope.importStatements = [];
    }

    const result: lua.Statement[] = [];
    const requireCall = createModuleRequire(context, statement.moduleSpecifier);

    // import "./module";
    // require("module")
    if (statement.importClause === undefined) {
        result.push(lua.createExpressionStatement(requireCall));

        scope.importStatements.push(...result);
        return undefined;
    }

    const importPath = ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text.replace(/"/g, "")
        : "module";

    // Create the require statement to extract values.
    // local ____module = require("module")
    const importUniqueName = lua.createIdentifier(createSafeName(path.basename(importPath)));

    let usingRequireStatement = false;

    // import defaultValue from "./module";
    // local defaultValue = __module.default
    if (statement.importClause.name) {
        if (shouldBeImported(context, statement.importClause)) {
            const propertyName = createDefaultExportStringLiteral(statement.importClause.name);
            const defaultImportAssignmentStatement = lua.createVariableDeclarationStatement(
                transformIdentifier(context, statement.importClause.name),
                lua.createTableIndexExpression(importUniqueName, propertyName),
                statement.importClause.name
            );

            result.push(defaultImportAssignmentStatement);
            usingRequireStatement = true;
        }
    }

    // import * as module from "./module";
    // local module = require("module")
    if (statement.importClause.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings)) {
        if (context.resolver.isReferencedAliasDeclaration(statement.importClause.namedBindings)) {
            const requireStatement = lua.createVariableDeclarationStatement(
                transformIdentifier(context, statement.importClause.namedBindings.name),
                requireCall,
                statement
            );

            result.push(requireStatement);
        }
    }

    // import { a, b, c } from "./module";
    // local a = __module.a
    // local b = __module.b
    // local c = __module.c
    if (statement.importClause.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
        const assignmentStatements = statement.importClause.namedBindings.elements
            .filter(importSpecifier => shouldBeImported(context, importSpecifier))
            .map(importSpecifier => transformImportSpecifier(context, importSpecifier, importUniqueName));

        if (assignmentStatements.length > 0) {
            usingRequireStatement = true;
        }

        result.push(...assignmentStatements);
    }

    if (result.length === 0) {
        return undefined;
    }

    if (usingRequireStatement) {
        result.unshift(lua.createVariableDeclarationStatement(importUniqueName, requireCall, statement));
    }

    scope.importStatements.push(...result);
    return undefined;
};

export const transformExternalModuleReference: FunctionVisitor<ts.ExternalModuleReference> = (node, context) =>
    createModuleRequire(context, node.expression, node);

export const transformImportEqualsDeclaration: FunctionVisitor<ts.ImportEqualsDeclaration> = (node, context) => {
    if (
        !context.resolver.isReferencedAliasDeclaration(node) &&
        (ts.isExternalModuleReference(node.moduleReference) ||
            ts.isExternalModule(context.sourceFile) ||
            !context.resolver.isTopLevelValueImportEqualsWithEntityName(node))
    ) {
        return undefined;
    }

    const name = transformIdentifier(context, node.name);
    const expression = context.transformExpression(node.moduleReference);
    return createHoistableVariableDeclarationStatement(context, name, expression, node);
};

export const transformImportExpression: FunctionVisitor<ts.CallExpression> = (node, context) => {
    importLuaLibFeature(context, LuaLibFeature.Promise);

    const moduleRequire =
        node.arguments.length > 0 ? createModuleRequire(context, node.arguments[0], node) : lua.createNilLiteral();
    return lua.createCallExpression(createStaticPromiseFunctionAccessor("resolve", node), [moduleRequire], node);
};
