import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinIdentifierExpression, checkForLuaLibType } from "../builtins";
import { isPromiseClass, createPromiseIdentifier } from "../builtins/promise";
import { FunctionVisitor, tempSymbolId, TransformationContext } from "../context";
import { invalidCallExtensionUse } from "../utils/diagnostics";
import { createExportedIdentifier, getSymbolExportScope } from "../utils/export";
import { createSafeName, hasUnsafeIdentifierName } from "../utils/safe-names";
import { getIdentifierSymbolId } from "../utils/symbols";
import { isOptionalContinuation } from "./optional-chaining";
import { isStandardLibraryType } from "../utils/typescript";
import { getExtensionKindForNode, getExtensionKindForSymbol } from "../utils/language-extensions";
import { callExtensions } from "./language-extensions/call-extension";
import { isIdentifierExtensionValue, reportInvalidExtensionValue } from "./language-extensions/identifier";

export function transformIdentifier(context: TransformationContext, identifier: ts.Identifier): lua.Identifier {
    return transformNonValueIdentifier(context, identifier, context.checker.getSymbolAtLocation(identifier));
}
function transformNonValueIdentifier(
    context: TransformationContext,
    identifier: ts.Identifier,
    symbol: ts.Symbol | undefined
) {
    if (isOptionalContinuation(identifier)) {
        return lua.createIdentifier(identifier.text, undefined, tempSymbolId);
    }

    const extensionKind = symbol
        ? getExtensionKindForSymbol(context, symbol)
        : getExtensionKindForNode(context, identifier);

    if (extensionKind) {
        if (callExtensions.has(extensionKind)) {
            context.diagnostics.push(invalidCallExtensionUse(identifier));
            // fall through
        } else if (isIdentifierExtensionValue(symbol, extensionKind)) {
            reportInvalidExtensionValue(context, identifier, extensionKind);
            return lua.createAnonymousIdentifier(identifier);
        }
    }

    const type = context.checker.getTypeAtLocation(identifier);
    if (isStandardLibraryType(context, type, undefined)) {
        checkForLuaLibType(context, type);
        if (isPromiseClass(context, identifier)) {
            return createPromiseIdentifier(identifier);
        }
    }

    const text = hasUnsafeIdentifierName(context, identifier, symbol)
        ? createSafeName(identifier.text)
        : identifier.text;

    const symbolId = getIdentifierSymbolId(context, identifier, symbol);
    return lua.createIdentifier(text, identifier, symbolId, identifier.text);
}

export function transformIdentifierWithSymbol(
    context: TransformationContext,
    node: ts.Identifier,
    symbol: ts.Symbol | undefined
): lua.Expression {
    if (symbol) {
        const exportScope = getSymbolExportScope(context, symbol);
        if (exportScope) {
            const name = symbol.name;
            const text = hasUnsafeIdentifierName(context, node, symbol) ? createSafeName(name) : name;
            const symbolId = getIdentifierSymbolId(context, node, symbol);
            const identifier = lua.createIdentifier(text, node, symbolId, name);
            return createExportedIdentifier(context, identifier, exportScope);
        }
    }
    const builtinResult = transformBuiltinIdentifierExpression(context, node, symbol);
    if (builtinResult) {
        return builtinResult;
    }

    return transformNonValueIdentifier(context, node, symbol);
}

export const transformIdentifierExpression: FunctionVisitor<ts.Identifier> = (node, context) => {
    if (node.originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
        return lua.createNilLiteral(node);
    }

    const symbol = context.checker.getSymbolAtLocation(node);
    return transformIdentifierWithSymbol(context, node, symbol);
};
