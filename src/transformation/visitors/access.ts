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

export const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression> = (node, context) => {
    const property = node.name.text;
    const type = context.checker.getTypeAtLocation(node.expression);

    const annotations = getTypeAnnotations(type);

    if (annotations.has(AnnotationKind.LuaTable)) {
        context.diagnostics.push(annotationRemoved(node, AnnotationKind.LuaTable));
    }

    if (ts.isOptionalChain(node)) {
        context.diagnostics.push(optionalChainingNotSupported(node));
    }

    const constEnumValue = tryGetConstEnumValue(context, node);
    if (constEnumValue) {
        return constEnumValue;
    }

    const builtinResult = transformBuiltinPropertyAccessExpression(context, node);
    if (builtinResult) {
        return builtinResult;
    }

    if (ts.isCallExpression(node.expression) && returnsMultiType(context, node.expression)) {
        context.diagnostics.push(invalidMultiReturnAccess(node));
    }

    // Do not output path for member only enums
    if (annotations.has(AnnotationKind.CompileMembersOnly)) {
        if (ts.isPropertyAccessExpression(node.expression)) {
            // in case of ...x.enum.y transform to ...x.y
            return lua.createTableIndexExpression(
                context.transformExpression(node.expression.expression),
                lua.createStringLiteral(property),
                node
            );
        } else {
            return lua.createIdentifier(property, node);
        }
    }

    const callPath = context.transformExpression(node.expression);
    return lua.createTableIndexExpression(callPath, lua.createStringLiteral(property), node);
};

export const transformQualifiedName: FunctionVisitor<ts.QualifiedName> = (node, context) => {
    const right = lua.createStringLiteral(node.right.text, node.right);
    const left = context.transformExpression(node.left);

    return lua.createTableIndexExpression(left, right, node);
};
