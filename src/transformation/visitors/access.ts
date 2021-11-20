import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinPropertyAccessExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import {
    annotationRemoved,
    invalidMultiReturnAccess,
    unsupportedOptionalCompileMembersOnly,
} from "../utils/diagnostics";
import { addToNumericExpression } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isArrayType, isNumberType, isStringType } from "../utils/typescript";
import { tryGetConstEnumValue } from "./enum";
import { transformOrderedExpressions, moveToPrecedingTemp } from "./expression-list";
import { isMultiReturnCall, returnsMultiType } from "./language-extensions/multi";
import {
    transformOptionalChainWithCapture,
    ExpressionWithThisValue,
    isOptionalContinuation,
} from "./optional-chaining";

function addOneToArrayAccessArgument(
    context: TransformationContext,
    node: ts.ElementAccessExpression,
    index: lua.Expression
): lua.Expression {
    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if (isArrayType(context, type) && isNumberType(context, argumentType)) {
        return addToNumericExpression(index, 1);
    }
    return index;
}

export function transformElementAccessArgument(
    context: TransformationContext,
    node: ts.ElementAccessExpression
): lua.Expression {
    const index = context.transformExpression(node.argumentExpression);
    return addOneToArrayAccessArgument(context, node, index);
}

export const transformElementAccessExpression: FunctionVisitor<ts.ElementAccessExpression> = (node, context) =>
    transformElementAccessExpressionWithCapture(context, node, false).expression;
export function transformElementAccessExpressionWithCapture(
    context: TransformationContext,
    node: ts.ElementAccessExpression,
    captureThisValue: boolean
): ExpressionWithThisValue {
    const constEnumValue = tryGetConstEnumValue(context, node);
    if (constEnumValue) {
        return { expression: constEnumValue };
    }

    if (ts.isOptionalChain(node)) {
        return transformOptionalChainWithCapture(context, node, captureThisValue);
    }

    let [table, accessExpression] = transformOrderedExpressions(context, [node.expression, node.argumentExpression]);

    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if (isStringType(context, type) && isNumberType(context, argumentType)) {
        // strings are not callable, so ignore captureThisValue
        return {
            expression: transformLuaLibFunction(context, LuaLibFeature.StringAccess, node, table, accessExpression),
        };
    }

    const updatedAccessExpression = addOneToArrayAccessArgument(context, node, accessExpression);

    if (isMultiReturnCall(context, node.expression)) {
        const accessType = context.checker.getTypeAtLocation(node.argumentExpression);
        if (!isNumberType(context, accessType)) {
            context.diagnostics.push(invalidMultiReturnAccess(node));
        }

        // When selecting the first element, we can shortcut
        if (ts.isNumericLiteral(node.argumentExpression) && node.argumentExpression.text === "0") {
            return { expression: table };
        } else {
            const selectIdentifier = lua.createIdentifier("select");
            return { expression: lua.createCallExpression(selectIdentifier, [updatedAccessExpression, table]) };
        }
    }

    if (captureThisValue) {
        table = moveToPrecedingTemp(context, table, node.expression);
    }
    const thisValue = captureThisValue ? table : undefined;
    const expression = lua.createTableIndexExpression(table, updatedAccessExpression, node);
    return { expression, thisValue };
}

export const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression> = (node, context) =>
    transformPropertyAccessExpressionWithCapture(context, node, false).expression;
export function transformPropertyAccessExpressionWithCapture(
    context: TransformationContext,
    node: ts.PropertyAccessExpression,
    captureThisValue: boolean
): ExpressionWithThisValue {
    const property = node.name.text;
    const type = context.checker.getTypeAtLocation(node.expression);
    const isOptionalLeft = isOptionalContinuation(node.expression);

    const annotations = getTypeAnnotations(type);

    if (annotations.has(AnnotationKind.LuaTable)) {
        context.diagnostics.push(annotationRemoved(node, AnnotationKind.LuaTable));
    }

    const constEnumValue = tryGetConstEnumValue(context, node);
    if (constEnumValue) {
        return { expression: constEnumValue };
    }

    if (ts.isCallExpression(node.expression) && returnsMultiType(context, node.expression)) {
        context.diagnostics.push(invalidMultiReturnAccess(node));
    }

    if (ts.isOptionalChain(node)) {
        return transformOptionalChainWithCapture(context, node, captureThisValue);
    }

    // Do not output path for member only enums
    if (annotations.has(AnnotationKind.CompileMembersOnly)) {
        if (isOptionalLeft) {
            context.diagnostics.push(unsupportedOptionalCompileMembersOnly(node));
        }
        if (ts.isPropertyAccessExpression(node.expression)) {
            // in case of ...x.enum.y transform to ...x.y
            const expression = lua.createTableIndexExpression(
                context.transformExpression(node.expression.expression),
                lua.createStringLiteral(property),
                node
            );
            return { expression };
        } else {
            return { expression: lua.createIdentifier(property, node) };
        }
    }

    const builtinResult = transformBuiltinPropertyAccessExpression(context, node);
    if (builtinResult) {
        // Ignore captureThisValue.
        // This assumes that nothing returned by builtin property accesses are callable.
        // If this assumption is no longer true, this may need to be updated.
        return { expression: builtinResult };
    }

    let table = context.transformExpression(node.expression);
    if (captureThisValue) {
        table = moveToPrecedingTemp(context, table, node.expression);
    }
    const thisValue = captureThisValue ? table : undefined;
    const expression = lua.createTableIndexExpression(table, lua.createStringLiteral(property), node);
    return { expression, thisValue };
}

export const transformQualifiedName: FunctionVisitor<ts.QualifiedName> = (node, context) => {
    const right = lua.createStringLiteral(node.right.text, node.right);
    const left = context.transformExpression(node.left);

    return lua.createTableIndexExpression(left, right, node);
};
