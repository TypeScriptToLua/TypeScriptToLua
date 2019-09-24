import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { transformBuiltinIdentifierExpression } from "../builtins";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
import { isForRangeType } from "../utils/annotations";
import { InvalidForRangeCall } from "../utils/errors";
import { createExportedIdentifier, getIdentifierExportScope } from "../utils/export";
import { createSafeName, hasUnsafeIdentifierName } from "../utils/safe-names";
import { getIdentifierSymbolId } from "../utils/symbols";
import { findFirstNodeAbove } from "../utils/typescript";

export function transformIdentifier(context: TransformationContext, identifier: ts.Identifier): tstl.Identifier {
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
    return tstl.createIdentifier(text, identifier, symbolId, identifier.text);
}

const transformIdentifierExpression: FunctionVisitor<ts.Identifier> = (node, context) => {
    // TODO: Move below to avoid extra transforms?
    const identifier = transformIdentifier(context, node);

    const exportScope = getIdentifierExportScope(context, identifier);
    if (exportScope) {
        return createExportedIdentifier(context, identifier, exportScope);
    }

    if (node.originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
        return tstl.createNilLiteral();
    }

    const builtinResult = transformBuiltinIdentifierExpression(context, node);
    if (builtinResult) {
        return builtinResult;
    }

    return identifier;
};

export const identifierPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.Identifier]: transformIdentifierExpression,
    },
};
