import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { addExportToIdentifier, createExportedIdentifier, getIdentifierExportScope } from "../utils/export";
import {
    createHoistableVariableDeclarationStatement,
    createLocalOrExportedOrGlobalDeclaration,
} from "../utils/lua-ast";
import { createSafeName, isUnsafeName } from "../utils/safe-names";
import { performHoisting, ScopeType } from "../utils/scope";
import { getSymbolIdOfSymbol } from "../utils/symbols";
import { transformIdentifier } from "./identifier";

export function createModuleLocalNameIdentifier(
    context: TransformationContext,
    declaration: ts.ModuleDeclaration
): lua.Identifier {
    const moduleSymbol = context.checker.getSymbolAtLocation(declaration.name);
    if (moduleSymbol !== undefined && isUnsafeName(moduleSymbol.name, context.options)) {
        return lua.createIdentifier(
            createSafeName(declaration.name.text),
            declaration.name,
            moduleSymbol && getSymbolIdOfSymbol(context, moduleSymbol),
            declaration.name.text
        );
    }

    // TODO: Should synthetic name nodes be escaped as well?
    return transformIdentifier(context, declaration.name as ts.Identifier);
}

// TODO: Do it based on transform result?
function moduleHasEmittedBody(
    node: ts.ModuleDeclaration
): node is ts.ModuleDeclaration & { body: ts.ModuleBlock | ts.ModuleDeclaration } {
    if (node.body) {
        if (ts.isModuleBlock(node.body)) {
            // Ignore if body has no emitted statements
            return node.body.statements.some(s => !ts.isInterfaceDeclaration(s) && !ts.isTypeAliasDeclaration(s));
        } else if (ts.isModuleDeclaration(node.body)) {
            return true;
        }
    }

    return false;
}

export const transformModuleDeclaration: FunctionVisitor<ts.ModuleDeclaration> = (node, context) => {
    const currentNamespace = context.currentNamespaces;
    const result: lua.Statement[] = [];

    const symbol = context.checker.getSymbolAtLocation(node.name);
    const hasExports = symbol !== undefined && context.checker.getExportsOfModule(symbol).length > 0;
    const nameIdentifier = transformIdentifier(context, node.name as ts.Identifier);
    const exportScope = getIdentifierExportScope(context, nameIdentifier);

    // Non-module namespace could be merged if:
    // - is top level
    // - is nested and exported
    const isNonModuleMergeable = !context.isModule && (!currentNamespace || exportScope);

    // This is NOT the first declaration if:
    // - declared as a module before this (ignore interfaces with same name)
    // - declared as a class or function at all (TS requires these to be before module, unless module is empty)
    const isFirstDeclaration =
        symbol === undefined ||
        (!symbol.declarations?.some(d => ts.isClassLike(d) || ts.isFunctionDeclaration(d)) &&
            ts.getOriginalNode(node) === symbol.declarations?.find(ts.isModuleDeclaration));

    if (isNonModuleMergeable) {
        // 'local NS = NS or {}' or 'exportTable.NS = exportTable.NS or {}'
        const localDeclaration = createLocalOrExportedOrGlobalDeclaration(
            context,
            nameIdentifier,
            lua.createBinaryExpression(
                addExportToIdentifier(context, nameIdentifier),
                lua.createTableExpression(),
                lua.SyntaxKind.OrOperator
            )
        );

        result.push(...localDeclaration);
    } else if (isFirstDeclaration) {
        // local NS = {} or exportTable.NS = {}
        const localDeclaration = createLocalOrExportedOrGlobalDeclaration(
            context,
            nameIdentifier,
            lua.createTableExpression()
        );

        result.push(...localDeclaration);
    }

    if ((isNonModuleMergeable || isFirstDeclaration) && exportScope && hasExports && moduleHasEmittedBody(node)) {
        // local NS = exportTable.NS
        const localDeclaration = createHoistableVariableDeclarationStatement(
            context,
            createModuleLocalNameIdentifier(context, node),
            createExportedIdentifier(context, nameIdentifier, exportScope)
        );

        result.push(localDeclaration);
    }

    // Set current namespace for nested NS
    // Keep previous namespace to reset after block transpilation

    context.currentNamespaces = node;

    // Transform moduleblock to block and visit it
    if (moduleHasEmittedBody(node)) {
        context.pushScope(ScopeType.Block);
        const statements = performHoisting(
            context,
            context.transformStatements(ts.isModuleBlock(node.body) ? node.body.statements : node.body)
        );
        context.popScope();
        result.push(lua.createDoStatement(statements));
    }

    context.currentNamespaces = currentNamespace;

    return result;
};
