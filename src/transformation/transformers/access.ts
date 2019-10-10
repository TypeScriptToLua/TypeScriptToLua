import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { transformBuiltinPropertyAccessExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { createExpressionPlusOne } from "../utils/lua-ast";
import { isArrayType, isNumberType, isStringType } from "../utils/typescript";
import { tryGetConstEnumValue } from "./enum";
import { transformLuaTableElementAccessExpression, transformLuaTablePropertyAccessExpression } from "./lua-table";

export function transformElementAccessArgument(
    context: TransformationContext,
    node: ts.ElementAccessExpression
): tstl.Expression {
    const index = context.transformExpression(node.argumentExpression);

    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if (isNumberType(context, argumentType) && isArrayType(context, type)) {
        return createExpressionPlusOne(index);
    }

    return index;
}

export const transformElementAccessExpression: FunctionVisitor<ts.ElementAccessExpression> = (expression, context) => {
    transformLuaTableElementAccessExpression(context, expression);

    const constEnumValue = tryGetConstEnumValue(context, expression);
    if (constEnumValue) {
        return constEnumValue;
    }

    let table = context.transformExpression(expression.expression);
    if (tstl.isTableExpression(table)) {
        table = tstl.createParenthesizedExpression(table);
    }

    const argumentType = context.checker.getTypeAtLocation(expression.argumentExpression);
    const type = context.checker.getTypeAtLocation(expression.expression);
    if (isNumberType(context, argumentType) && isStringType(context, type)) {
        const index = context.transformExpression(expression.argumentExpression);
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("string"), tstl.createStringLiteral("sub")),
            [table, createExpressionPlusOne(index), createExpressionPlusOne(index)],
            expression
        );
    }

    return tstl.createTableIndexExpression(table, transformElementAccessArgument(context, expression), expression);
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

    const annotations = getTypeAnnotations(context, type);
    // Do not output path for member only enums
    if (annotations.has(AnnotationKind.CompileMembersOnly)) {
        if (ts.isPropertyAccessExpression(expression.expression)) {
            // in case of ...x.enum.y transform to ...x.y
            return tstl.createTableIndexExpression(
                context.transformExpression(expression.expression.expression),
                tstl.createStringLiteral(property),
                expression
            );
        } else {
            return tstl.createIdentifier(property, expression);
        }
    }

    let callPath = context.transformExpression(expression.expression);
    if (tstl.isTableExpression(callPath)) {
        callPath = tstl.createParenthesizedExpression(callPath);
    }

    return tstl.createTableIndexExpression(callPath, tstl.createStringLiteral(property), expression);
};

export const transformQualifiedName: FunctionVisitor<ts.QualifiedName> = (node, context) => {
    const right = tstl.createStringLiteral(node.right.text, node.right);
    const left = context.transformExpression(node.left);

    return tstl.createTableIndexExpression(left, right, node);
};
