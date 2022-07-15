import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinIdentifierExpression, checkForLuaLibType } from "../builtins";
import { isPromiseClass, createPromiseIdentifier } from "../builtins/promise";
import { FunctionVisitor, tempSymbolId, TransformationContext } from "../context";
import { AnnotationKind, isForRangeType } from "../utils/annotations";
import {
    invalidMultiFunctionUse,
    invalidOperatorMappingUse,
    invalidRangeUse,
    invalidVarargUse,
    invalidTableExtensionUse,
    annotationRemoved,
} from "../utils/diagnostics";
import { createExportedIdentifier, getSymbolExportScope } from "../utils/export";
import { createSafeName, hasUnsafeIdentifierName } from "../utils/safe-names";
import { getIdentifierSymbolId } from "../utils/symbols";
import { operatorMapExtensions } from "./language-extensions/operators";
import { tableExtensions } from "./language-extensions/table";
import { isOptionalContinuation } from "./optional-chaining";
import { isStandardLibraryType } from "../utils/typescript";
import { getExtensionKindForNode, ExtensionKind, getExtensionKindForSymbol } from "../utils/language-extensions";

function reportInvalidExtensionValue(
    context: TransformationContext,
    identifier: ts.Identifier,
    extensionKind: ExtensionKind
): void {
    if (extensionKind === ExtensionKind.MultiFunction) {
        context.diagnostics.push(invalidMultiFunctionUse(identifier));
    } else if (extensionKind === ExtensionKind.RangeFunction) {
        context.diagnostics.push(invalidRangeUse(identifier));
    } else if (extensionKind === ExtensionKind.VarargConstant) {
        context.diagnostics.push(invalidVarargUse(identifier));
    }
}

const extensionKindToValueName: { [T in ExtensionKind]?: string } = {
    [ExtensionKind.MultiFunction]: "$multi",
    [ExtensionKind.RangeFunction]: "$range",
    [ExtensionKind.VarargConstant]: "$vararg",
};

function isIdentifierExtensionValue(symbol: ts.Symbol | undefined, extensionKind: ExtensionKind): boolean {
    return symbol !== undefined && extensionKindToValueName[extensionKind] === symbol.getName();
}

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
        if (operatorMapExtensions.has(extensionKind)) {
            context.diagnostics.push(invalidOperatorMappingUse(identifier));
            // fall through
        } else if (tableExtensions.has(extensionKind)) {
            context.diagnostics.push(invalidTableExtensionUse(identifier));
            // fall through
        } else if (isIdentifierExtensionValue(symbol, extensionKind)) {
            reportInvalidExtensionValue(context, identifier, extensionKind);
            return lua.createAnonymousIdentifier(identifier);
        }
    }

    if (isForRangeType(context, identifier)) {
        context.diagnostics.push(annotationRemoved(identifier, AnnotationKind.ForRange));
    }

    const type = context.checker.getTypeAtLocation(identifier);
    if (isStandardLibraryType(context, type, undefined)) {
        checkForLuaLibType(context, type);
        if (isPromiseClass(identifier)) {
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
