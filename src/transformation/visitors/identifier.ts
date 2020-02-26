import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinIdentifierExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { isForRangeType } from "../utils/annotations";
import { InvalidForRangeCall } from "../utils/errors";
import { createExportedIdentifier, getSymbolExportScope } from "../utils/export";
import { createSafeName, hasUnsafeIdentifierName } from "../utils/safe-names";
import { getIdentifierSymbolId } from "../utils/symbols";
import { findFirstNodeAbove } from "../utils/typescript";

export function transformIdentifier(context: TransformationContext, identifier: ts.Identifier): lua.Identifier {
    if (isForRangeType(context, identifier)) {
        const callExpression = findFirstNodeAbove(identifier, ts.isCallExpression);
        if (!callExpression || !callExpression.parent || !ts.isForOfStatement(callExpression.parent)) {
            throw InvalidForRangeCall(
                identifier,
                "@forRange function can only be used as an iterable in a for...of loop."
            );
        }
    }

    const text = hasUnsafeIdentifierName(context, identifier) ? createSafeName(identifier.text) : identifier.text;

    const symbolId = getIdentifierSymbolId(context, identifier);
    return lua.createIdentifier(text, identifier, symbolId, identifier.text);
}

export const transformIdentifierExpression: FunctionVisitor<ts.Identifier> = (node, context) => {
    const symbol = context.checker.getSymbolAtLocation(node);
    const exportScope = symbol ? getSymbolExportScope(context, symbol) : undefined;
    if (exportScope) {
        const name = symbol?.name ?? node.text;
        const text = hasUnsafeIdentifierName(context, node) ? createSafeName(name) : name;

        const symbolId = getIdentifierSymbolId(context, node);
        return createExportedIdentifier(context, lua.createIdentifier(text, node, symbolId, name), exportScope);
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
