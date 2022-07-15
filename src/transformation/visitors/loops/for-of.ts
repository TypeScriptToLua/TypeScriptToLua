import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, isForRangeType, isLuaIteratorType } from "../../utils/annotations";
import { annotationRemoved } from "../../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType } from "../../utils/typescript";
import {
    transformForOfIterableStatement,
    transformForOfPairsIterableStatement,
    transformForOfPairsKeyIterableStatement,
} from "../language-extensions/iterable";
import { isRangeFunction, transformRangeStatement } from "../language-extensions/range";
import { transformForInitializer, transformLoopBody } from "./utils";
import { getIterableExtensionKindForNode } from "../../utils/language-extensions";
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
    } else if (ts.isCallExpression(node.expression) && isForRangeType(context, node.expression.expression)) {
        context.diagnostics.push(annotationRemoved(node.expression, AnnotationKind.ForRange));
        return undefined;
    }
    const iterableType = getIterableExtensionKindForNode(context, node.expression);
    if (iterableType) {
        if (iterableType === "Iterable") {
            return transformForOfIterableStatement(context, node, body);
        } else if (iterableType === "Pairs") {
            return transformForOfPairsIterableStatement(context, node, body);
        } else if (iterableType === "PairsKey") {
            return transformForOfPairsKeyIterableStatement(context, node, body);
        } else {
            assertNever(iterableType);
        }
    }
    if (isLuaIteratorType(context, node.expression)) {
        context.diagnostics.push(annotationRemoved(node.expression, AnnotationKind.LuaIterator));
        return undefined;
    }
    if (isArrayType(context, context.checker.getTypeAtLocation(node.expression))) {
        return transformForOfArrayStatement(context, node, body);
    }

    return transformForOfIteratorStatement(context, node, body);
};
