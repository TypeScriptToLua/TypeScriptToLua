import * as path from "path";
import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { formatPathToLuaPath } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getSymbolAnnotations, getTypeAnnotations } from "../../utils/annotations";
import { UnresolvableRequirePath } from "../../utils/errors";
import { createDefaultExportStringLiteral } from "../../utils/export";
import { createHoistableVariableDeclarationStatement } from "../../utils/lua-ast";
import { createSafeName } from "../../utils/safe-names";
import { peekScope } from "../../utils/scope";
import { transformIdentifier } from "../identifier";
import { transformPropertyName } from "../literal";

const getAbsoluteImportPath = (relativePath: string, directoryPath: string, options: ts.CompilerOptions): string =>
    relativePath[0] !== "." && options.baseUrl
        ? path.resolve(options.baseUrl, relativePath)
        : path.resolve(directoryPath, relativePath);

function getImportPath(fileName: string, relativePath: string, node: ts.Node, options: ts.CompilerOptions): string {
    const rootDir = options.rootDir ? path.resolve(options.rootDir) : path.resolve(".");

    const absoluteImportPath = path.format(
        path.parse(getAbsoluteImportPath(relativePath, path.dirname(fileName), options))
    );
    const absoluteRootDirPath = path.format(path.parse(rootDir));
    if (absoluteImportPath.includes(absoluteRootDirPath)) {
        return formatPathToLuaPath(absoluteImportPath.replace(absoluteRootDirPath, "").slice(1));
    } else {
        throw UnresolvableRequirePath(
            node,
            `Cannot create require path. Module does not exist within --rootDir`,
            relativePath
        );
    }
}

function shouldResolveModulePath(context: TransformationContext, moduleSpecifier: ts.Expression): boolean {
    const moduleOwnerSymbol = context.checker.getSymbolAtLocation(moduleSpecifier);
    if (!moduleOwnerSymbol) return true;

    const annotations = getSymbolAnnotations(context, moduleOwnerSymbol);
    return !annotations.has(AnnotationKind.NoResolution);
}

export function createModuleRequire(
    context: TransformationContext,
    moduleSpecifier: ts.Expression,
    tsOriginal: ts.Node = moduleSpecifier
): lua.CallExpression {
    const params: lua.Expression[] = [];
    if (ts.isStringLiteral(moduleSpecifier)) {
        const modulePath = shouldResolveModulePath(context, moduleSpecifier)
            ? getImportPath(
                  context.sourceFile.fileName,
                  moduleSpecifier.text.replace(/"/g, ""),
                  moduleSpecifier,
                  context.options
              )
            : moduleSpecifier.text;

        params.push(lua.createStringLiteral(modulePath));
    }

    return lua.createCallExpression(lua.createIdentifier("require"), params, tsOriginal);
}

function shouldBeImported(context: TransformationContext, importNode: ts.ImportClause | ts.ImportSpecifier): boolean {
    const annotations = getTypeAnnotations(context, context.checker.getTypeAtLocation(importNode));

    return (
        context.resolver.isReferencedAliasDeclaration(importNode) &&
        !annotations.has(AnnotationKind.Extension) &&
        !annotations.has(AnnotationKind.MetaExtension)
    );
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

    if (!context.options.noHoisting && !scope.importStatements) {
        scope.importStatements = [];
    }

    const result: lua.Statement[] = [];
    const requireCall = createModuleRequire(context, statement.moduleSpecifier);

    // import "./module";
    // require("module")
    if (statement.importClause === undefined) {
        result.push(lua.createExpressionStatement(requireCall));

        if (scope.importStatements) {
            scope.importStatements.push(...result);
            return undefined;
        } else {
            return result;
        }
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

    if (scope.importStatements) {
        scope.importStatements.push(...result);
        return undefined;
    } else {
        return result;
    }
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
