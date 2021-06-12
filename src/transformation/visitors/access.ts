import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinPropertyAccessExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { annotationRemoved, invalidMultiReturnAccess, optionalChainingNotSupported } from "../utils/diagnostics";
import { addToNumericExpression } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isArrayType, isNumberType, isStringType } from "../utils/typescript";
import { tryGetConstEnumValue } from "./enum";
import { returnsMultiType } from "./language-extensions/multi";

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
    const annotations = getTypeAnnotations(context.checker.getTypeAtLocation(node.expression));
    if (annotations.has(AnnotationKind.LuaTable)) {
        context.diagnostics.push(annotationRemoved(node, AnnotationKind.LuaTable));
    }

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

    const accessExpression = transformElementAccessArgument(context, node);

    if (ts.isCallExpression(node.expression) && returnsMultiType(context, node.expression)) {
        const accessType = context.checker.getTypeAtLocation(node.argumentExpression);
        if (!isNumberType(context, accessType)) {
            context.diagnostics.push(invalidMultiReturnAccess(node));
        }

        const selectIdentifier = lua.createIdentifier("select");
        const selectCall = lua.createCallExpression(selectIdentifier, [accessExpression, table]);
        return selectCall;
    }

    return lua.createTableIndexExpression(table, accessExpression, node);
};

export const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression> = (
    expression,
    context
) => {
    if (ts.isOptionalChain(expression)) {
        context.diagnostics.push(optionalChainingNotSupported(expression));
    }

    const constEnumValue = tryGetConstEnumValue(context, expression);
    if (constEnumValue) {
        return constEnumValue;
    }

    const builtinResult = transformBuiltinPropertyAccessExpression(context, expression);
    if (builtinResult) {
        return builtinResult;
    }

    if (ts.isCallExpression(expression.expression) && returnsMultiType(context, expression.expression)) {
        context.diagnostics.push(invalidMultiReturnAccess(expression));
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
