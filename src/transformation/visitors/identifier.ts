import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinIdentifierExpression } from "../builtins";
import { createPromiseIdentifier, isPromiseClass } from "../builtins/promise";
import { FunctionVisitor, TransformationContext } from "../context";
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
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { createSafeName, hasUnsafeIdentifierName } from "../utils/safe-names";
import { getIdentifierSymbolId } from "../utils/symbols";
import { isMultiFunctionNode } from "./language-extensions/multi";
import { isOperatorMapping } from "./language-extensions/operators";
import { isRangeFunctionNode } from "./language-extensions/range";
import { isTableExtensionIdentifier } from "./language-extensions/table";
import { isVarargConstantNode } from "./language-extensions/vararg";

export function transformIdentifier(context: TransformationContext, identifier: ts.Identifier): lua.Identifier {
    if (isMultiFunctionNode(context, identifier)) {
        context.diagnostics.push(invalidMultiFunctionUse(identifier));
        return lua.createAnonymousIdentifier(identifier);
    }

    if (isOperatorMapping(context, identifier)) {
        context.diagnostics.push(invalidOperatorMappingUse(identifier));
    }

    if (isTableExtensionIdentifier(context, identifier)) {
        context.diagnostics.push(invalidTableExtensionUse(identifier));
    }

    if (isRangeFunctionNode(context, identifier)) {
        context.diagnostics.push(invalidRangeUse(identifier));
        return lua.createAnonymousIdentifier(identifier);
    }

    if (isVarargConstantNode(context, identifier)) {
        context.diagnostics.push(invalidVarargUse(identifier));
        return lua.createAnonymousIdentifier(identifier);
    }

    if (isForRangeType(context, identifier)) {
        context.diagnostics.push(annotationRemoved(identifier, AnnotationKind.ForRange));
    }

    if (isPromiseClass(context, identifier)) {
        importLuaLibFeature(context, LuaLibFeature.Promise);
        return createPromiseIdentifier(identifier);
    }

    const text = hasUnsafeIdentifierName(context, identifier) ? createSafeName(identifier.text) : identifier.text;

    const symbolId = getIdentifierSymbolId(context, identifier);
    return lua.createIdentifier(text, identifier, symbolId, identifier.text);
}

export const transformIdentifierExpression: FunctionVisitor<ts.Identifier> = (node, context) => {
    const symbol = context.checker.getSymbolAtLocation(node);
    if (symbol) {
        const exportScope = getSymbolExportScope(context, symbol);
        if (exportScope) {
            const name = symbol.name;
            const text = hasUnsafeIdentifierName(context, node) ? createSafeName(name) : name;
            const symbolId = getIdentifierSymbolId(context, node);
            const identifier = lua.createIdentifier(text, node, symbolId, name);
            return createExportedIdentifier(context, identifier, exportScope);
        }
    }

    if (node.originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
        return lua.createNilLiteral();
    }

    const builtinResult = transformBuiltinIdentifierExpression(context, node);
    if (builtinResult) {
        return builtinResult;
    }

    return transformIdentifier(context, node);
};
