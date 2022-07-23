import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType } from "../../utils/typescript";
import {
    transformForOfIterableStatement,
    transformForOfPairsIterableStatement,
    transformForOfPairsKeyIterableStatement,
} from "../language-extensions/iterable";
import { isRangeFunction, transformRangeStatement } from "../language-extensions/range";
import { transformForInitializer, transformLoopBody } from "./utils";
import { getIterableExtensionKindForNode, IterableExtensionKind } from "../../utils/language-extensions";
import { assertNever } from "../../../utils";

function transformForOfArrayStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const valueVariable = transformForInitializer(context, statement.initializer, block);
    const ipairsCall = lua.createCallExpression(lua.createIdentifier("ipairs"), [
        context.transformExpression(statement.expression),
    ]);

    return lua.createForInStatement(block, [lua.createAnonymousIdentifier(), valueVariable], [ipairsCall], statement);
}

function transformForOfIteratorStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const valueVariable = transformForInitializer(context, statement.initializer, block);
    const iterable = transformLuaLibFunction(
        context,
        LuaLibFeature.Iterator,
        statement.expression,
        context.transformExpression(statement.expression)
    );

    return lua.createForInStatement(block, [lua.createAnonymousIdentifier(), valueVariable], [iterable], statement);
}

export const transformForOfStatement: FunctionVisitor<ts.ForOfStatement> = (node, context) => {
    const body = lua.createBlock(transformLoopBody(context, node));

    if (ts.isCallExpression(node.expression) && isRangeFunction(context, node.expression)) {
        return transformRangeStatement(context, node, body);
    }
    const iterableExtensionType = getIterableExtensionKindForNode(context, node.expression);
    if (iterableExtensionType) {
        if (iterableExtensionType === IterableExtensionKind.Iterable) {
            return transformForOfIterableStatement(context, node, body);
        } else if (iterableExtensionType === IterableExtensionKind.Pairs) {
            return transformForOfPairsIterableStatement(context, node, body);
        } else if (iterableExtensionType === IterableExtensionKind.PairsKey) {
            return transformForOfPairsKeyIterableStatement(context, node, body);
        } else {
            assertNever(iterableExtensionType);
        }
    }
    if (isArrayType(context, context.checker.getTypeAtLocation(node.expression))) {
        return transformForOfArrayStatement(context, node, body);
    }

    return transformForOfIteratorStatement(context, node, body);
};
