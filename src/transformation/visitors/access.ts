import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinPropertyAccessExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import {
    invalidCallExtensionUse,
    invalidMultiReturnAccess,
    unsupportedOptionalCompileMembersOnly,
} from "../utils/diagnostics";
import { getExtensionKindForNode } from "../utils/language-extensions";
import { addToNumericExpression, createExportsIdentifier } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isArrayType, isNumberType, isStringType } from "../utils/typescript";
import { tryGetConstEnumValue } from "./enum";
import { transformOrderedExpressions } from "./expression-list";
import { callExtensions } from "./language-extensions/call-extension";
import { isMultiReturnCall, returnsMultiType } from "./language-extensions/multi";
import {
    transformOptionalChainWithCapture,
    ExpressionWithThisValue,
    isOptionalContinuation,
    captureThisValue,
} from "./optional-chaining";
import { SyntaxKind } from "typescript";
import { getCustomNameFromSymbol } from "./identifier";
import { getSymbolExportScope, isSymbolExported } from "../utils/export";

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
    transformElementAccessExpressionWithCapture(context, node, undefined).expression;
export function transformElementAccessExpressionWithCapture(
    context: TransformationContext,
    node: ts.ElementAccessExpression,
    thisValueCapture: lua.Identifier | undefined
): ExpressionWithThisValue {
    const constEnumValue = tryGetConstEnumValue(context, node);
    if (constEnumValue) {
        return { expression: constEnumValue };
    }

    if (ts.isOptionalChain(node)) {
        return transformOptionalChainWithCapture(context, node, thisValueCapture);
    }

    const [table, accessExpression] = transformOrderedExpressions(context, [node.expression, node.argumentExpression]);

    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if (isStringType(context, type) && isNumberType(context, argumentType)) {
        // strings are not callable, so ignore thisValueCapture
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

        const canOmitSelect = ts.isNumericLiteral(node.argumentExpression) && node.argumentExpression.text === "0";
        if (canOmitSelect) {
            // wrapping in parenthesis ensures only the first return value is used
            // https://www.lua.org/manual/5.1/manual.html#2.5
            return { expression: lua.createParenthesizedExpression(table) };
        }

        const selectIdentifier = lua.createIdentifier("select");
        return { expression: lua.createCallExpression(selectIdentifier, [updatedAccessExpression, table]) };
    }

    if (thisValueCapture) {
        const thisValue = captureThisValue(context, table, thisValueCapture, node.expression);
        return {
            expression: lua.createTableIndexExpression(thisValue, updatedAccessExpression, node),
            thisValue,
        };
    }
    return { expression: lua.createTableIndexExpression(table, updatedAccessExpression, node) };
}

export const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression> = (node, context) =>
    transformPropertyAccessExpressionWithCapture(context, node, undefined).expression;
export function transformPropertyAccessExpressionWithCapture(
    context: TransformationContext,
    node: ts.PropertyAccessExpression,
    thisValueCapture: lua.Identifier | undefined
): ExpressionWithThisValue {
    const type = context.checker.getTypeAtLocation(node.expression);
    const isOptionalLeft = isOptionalContinuation(node.expression);

    let property = node.name.text;
    const symbol = context.checker.getSymbolAtLocation(node.name);
    const customName = getCustomNameFromSymbol(symbol);
    if (customName) {
        property = customName;
    }

    const constEnumValue = tryGetConstEnumValue(context, node);
    if (constEnumValue) {
        return { expression: constEnumValue };
    }

    if (ts.isCallExpression(node.expression) && returnsMultiType(context, node.expression)) {
        context.diagnostics.push(invalidMultiReturnAccess(node));
    }

    if (ts.isOptionalChain(node)) {
        return transformOptionalChainWithCapture(context, node, thisValueCapture);
    }

    // Do not output path for member only enums
    const annotations = getTypeAnnotations(type);
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
            // Check if we need to account for enum being exported int his file
            if (
                isSymbolExported(context, type.symbol) &&
                getSymbolExportScope(context, type.symbol) === node.expression.getSourceFile()
            ) {
                return {
                    expression: lua.createTableIndexExpression(
                        createExportsIdentifier(),
                        lua.createStringLiteral(property),
                        node
                    ),
                };
            } else {
                return { expression: lua.createIdentifier(property, node) };
            }
        }
    }

    const builtinResult = transformBuiltinPropertyAccessExpression(context, node);
    if (builtinResult) {
        // Ignore thisValueCapture.
        // This assumes that nothing returned by builtin property accesses are callable.
        // If this assumption is no longer true, this may need to be updated.
        return { expression: builtinResult };
    }

    if (
        ts.isIdentifier(node.expression) &&
        node.parent &&
        (!ts.isCallExpression(node.parent) || node.parent.expression !== node)
    ) {
        // Check if this is a method call extension that is not used as a call
        const extensionType = getExtensionKindForNode(context, node);
        if (extensionType && callExtensions.has(extensionType)) {
            context.diagnostics.push(invalidCallExtensionUse(node));
        }
    }

    const table = context.transformExpression(node.expression);

    if (thisValueCapture) {
        const thisValue = captureThisValue(context, table, thisValueCapture, node.expression);
        const expression = lua.createTableIndexExpression(thisValue, lua.createStringLiteral(property), node);
        return {
            expression,
            thisValue,
        };
    }
    if (node.expression.kind === SyntaxKind.SuperKeyword) {
        const symbol = context.checker.getSymbolAtLocation(node);
        if (symbol && symbol.flags & ts.SymbolFlags.GetAccessor) {
            return {
                expression: transformLuaLibFunction(
                    context,
                    LuaLibFeature.DescriptorGet,
                    node,
                    lua.createIdentifier("self"),
                    table,
                    lua.createStringLiteral(property)
                ),
            };
        }
    }
    return { expression: lua.createTableIndexExpression(table, lua.createStringLiteral(property), node) };
}

export const transformQualifiedName: FunctionVisitor<ts.QualifiedName> = (node, context) => {
    const right = lua.createStringLiteral(node.right.text, node.right);
    const left = context.transformExpression(node.left);

    return lua.createTableIndexExpression(left, right, node);
};
