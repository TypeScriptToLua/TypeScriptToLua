import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinPropertyAccessExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { addToNumericExpression } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isArrayType, isNumberType, isStringType } from "../utils/typescript";
import { tryGetConstEnumValue } from "./enum";
import { transformLuaTablePropertyAccessExpression, validateLuaTableElementAccessExpression } from "./lua-table";

export function transformElementAccessArgument(
    context: TransformationContext,
    node: ts.ElementAccessExpression
): lua.Expression {
    const index = context.transformExpression(node.argumentExpression);

    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if (isArrayType(context, type) && isNumberType(context, argumentType)) {
        return addToNumericExpression(index, 1);
    }

    return index;
}

export const transformElementAccessExpression: FunctionVisitor<ts.ElementAccessExpression> = (node, context) => {
    validateLuaTableElementAccessExpression(context, node);

    const constEnumValue = tryGetConstEnumValue(context, node);
    if (constEnumValue) {
        return constEnumValue;
    }

    const table = context.transformExpression(node.expression);

    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if (isStringType(context, type) && isNumberType(context, argumentType)) {
        const index = context.transformExpression(node.argumentExpression);
        return transformLuaLibFunction(context, LuaLibFeature.StringAccess, node, table, index);
    }

    return lua.createTableIndexExpression(table, transformElementAccessArgument(context, node), node);
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
