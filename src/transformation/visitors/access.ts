import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinPropertyAccessExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { createExpressionPlusOne } from "../utils/lua-ast";
import { isArrayType, isNumberType, isStringType, isExpressionWithEvaluationEffect } from "../utils/typescript";
import { tryGetConstEnumValue } from "./enum";
import { transformLuaTablePropertyAccessExpression, validateLuaTableElementAccessExpression } from "./lua-table";

export function transformElementAccessArgument(
    context: TransformationContext,
    node: ts.ElementAccessExpression
): lua.Expression {
    const index = context.transformExpression(node.argumentExpression);

    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if (isNumberType(context, argumentType) && isArrayType(context, type)) {
        return createExpressionPlusOne(index);
    }

    return index;
}

export const transformElementAccessExpression: FunctionVisitor<ts.ElementAccessExpression> = (expression, context) => {
    validateLuaTableElementAccessExpression(context, expression);

    const constEnumValue = tryGetConstEnumValue(context, expression);
    if (constEnumValue) {
        return constEnumValue;
    }

    const argumentType = context.checker.getTypeAtLocation(expression.argumentExpression);
    const type = context.checker.getTypeAtLocation(expression.expression);
    if (isNumberType(context, argumentType) && isStringType(context, type)) {
        return transformStringIndex(context, expression);
    }

    const table = context.transformExpression(expression.expression);
    return lua.createTableIndexExpression(table, transformElementAccessArgument(context, expression), expression);
};

export const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression> = (
    expression,
    context
) => {
    const constEnumValue = tryGetConstEnumValue(context, expression);
    if (constEnumValue) {
        return constEnumValue;
    }

    const luaTableResult = transformLuaTablePropertyAccessExpression(context, expression);
    if (luaTableResult) {
        return luaTableResult;
    }

    const builtinResult = transformBuiltinPropertyAccessExpression(context, expression);
    if (builtinResult) {
        return builtinResult;
    }

    const property = expression.name.text;
    const type = context.checker.getTypeAtLocation(expression.expression);

    const annotations = getTypeAnnotations(type);
    // Do not output path for member only enums
    if (annotations.has(AnnotationKind.CompileMembersOnly)) {
        if (ts.isPropertyAccessExpression(expression.expression)) {
            // in case of ...x.enum.y transform to ...x.y
            return lua.createTableIndexExpression(
                context.transformExpression(expression.expression.expression),
                lua.createStringLiteral(property),
                expression
            );
        } else {
            return lua.createIdentifier(property, expression);
        }
    }

    const callPath = context.transformExpression(expression.expression);
    return lua.createTableIndexExpression(callPath, lua.createStringLiteral(property), expression);
};

export const transformQualifiedName: FunctionVisitor<ts.QualifiedName> = (node, context) => {
    const right = lua.createStringLiteral(node.right.text, node.right);
    const left = context.transformExpression(node.left);

    return lua.createTableIndexExpression(left, right, node);
};

function transformStringIndex(context: TransformationContext, expression: ts.ElementAccessExpression): lua.Expression {
    const string = context.transformExpression(expression.expression);
    // Translate to string.sub(str, index, index), cache index in case it has side effects.
    if (isExpressionWithEvaluationEffect(expression.argumentExpression)) {
        const indexIdentifier = lua.createIdentifier("____index");
        // string.sub(stringExpression, ____index, ____index)
        const subCall = lua.createCallExpression(
            lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("sub")),
            [string, lua.cloneIdentifier(indexIdentifier), lua.cloneIdentifier(indexIdentifier)],
            expression
        );
        // function(____index) string.sub(stringExpression, ____index, ____index)
        const functionExpression = lua.createFunctionExpression(
            lua.createBlock([lua.createReturnStatement([subCall])]),
            [lua.cloneIdentifier(indexIdentifier)]
        );
        // (function(____index) string.sub(stringExpression, ____index, ____index) end)(index + 1)
        const indexPlusOne = createExpressionPlusOne(context.transformExpression(expression.argumentExpression));
        return lua.createCallExpression(functionExpression, [indexPlusOne]);
    } else {
        const index = context.transformExpression(expression.argumentExpression);
        return lua.createCallExpression(
            lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("sub")),
            [string, createExpressionPlusOne(index), createExpressionPlusOne(index)],
            expression
        );
    }
}
