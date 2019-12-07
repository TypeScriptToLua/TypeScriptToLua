import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { ForbiddenLuaTableUseException, UnsupportedKind, UnsupportedProperty } from "../utils/errors";
import { transformArguments } from "./call";

function parseLuaTableExpression(
    context: TransformationContext,
    node: ts.LeftHandSideExpression
): [lua.Expression, string] {
    if (ts.isPropertyAccessExpression(node)) {
        return [context.transformExpression(node.expression), node.name.text];
    } else {
        throw UnsupportedKind("LuaTable access expression", node.kind, node);
    }
}

function validateLuaTableCall(methodName: string, callArguments: ts.NodeArray<ts.Expression>, original: ts.Node): void {
    if (callArguments.some(argument => ts.isSpreadElement(argument))) {
        throw ForbiddenLuaTableUseException("Arguments cannot be spread.", original);
    }

    switch (methodName) {
        case "get":
            if (callArguments.length !== 1) {
                throw ForbiddenLuaTableUseException("One parameter is required for get().", original);
            }
            break;

        case "set":
            if (callArguments.length !== 2) {
                throw ForbiddenLuaTableUseException("Two parameters are required for set().", original);
            }
            break;
    }
}

function transformLuaTableExpressionAsExpressionStatement(
    context: TransformationContext,
    expression: ts.CallExpression
): lua.Statement {
    const [luaTable, methodName] = parseLuaTableExpression(context, expression.expression);
    validateLuaTableCall(methodName, expression.arguments, expression);
    const signature = context.checker.getResolvedSignature(expression);
    const params = transformArguments(context, expression.arguments, signature);

    switch (methodName) {
        case "get":
            return lua.createVariableDeclarationStatement(
                lua.createAnonymousIdentifier(expression),
                lua.createTableIndexExpression(luaTable, params[0], expression),
                expression
            );
        case "set":
            return lua.createAssignmentStatement(
                lua.createTableIndexExpression(luaTable, params[0], expression),
                params.splice(1),
                expression
            );
        default:
            throw UnsupportedProperty("LuaTable", methodName, expression);
    }
}

export function transformLuaTableExpressionStatement(
    context: TransformationContext,
    node: ts.ExpressionStatement
): lua.Statement | undefined {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;

    if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
        const ownerType = context.checker.getTypeAtLocation(expression.expression.expression);
        const annotations = getTypeAnnotations(context, ownerType);
        if (annotations.has(AnnotationKind.LuaTable)) {
            return transformLuaTableExpressionAsExpressionStatement(context, expression);
        }
    }
}

export function transformLuaTableCallExpression(
    context: TransformationContext,
    node: ts.CallExpression
): lua.Expression | undefined {
    if (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) {
        const ownerType = context.checker.getTypeAtLocation(node.expression.expression);
        const annotations = getTypeAnnotations(context, ownerType);

        if (annotations.has(AnnotationKind.LuaTable)) {
            const [luaTable, methodName] = parseLuaTableExpression(context, node.expression);
            validateLuaTableCall(methodName, node.arguments, node);
            const signature = context.checker.getResolvedSignature(node);
            const params = transformArguments(context, node.arguments, signature);

            switch (methodName) {
                case "get":
                    return lua.createTableIndexExpression(luaTable, params[0], node);
                default:
                    throw UnsupportedProperty("LuaTable", methodName, node);
            }
        }
    }
}

export function transformLuaTablePropertyAccessExpression(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const type = context.checker.getTypeAtLocation(node.expression);
    const annotations = getTypeAnnotations(context, type);
    if (annotations.has(AnnotationKind.LuaTable)) {
        const [luaTable, propertyName] = parseLuaTableExpression(context, node);
        switch (node.name.text) {
            case "length":
                return lua.createUnaryExpression(luaTable, lua.SyntaxKind.LengthOperator, node);
            default:
                throw UnsupportedProperty("LuaTable", propertyName, node);
        }
    }
}

export function transformLuaTableElementAccessExpression(
    context: TransformationContext,
    node: ts.ElementAccessExpression
): void {
    const annotations = getTypeAnnotations(context, context.checker.getTypeAtLocation(node.expression));
    if (annotations.has(AnnotationKind.LuaTable)) {
        throw UnsupportedKind("LuaTable access expression", node.kind, node);
    }
}

export function transformLuaTableNewExpression(
    context: TransformationContext,
    node: ts.NewExpression
): lua.Expression | undefined {
    const type = context.checker.getTypeAtLocation(node);
    const annotations = getTypeAnnotations(context, type);
    if (annotations.has(AnnotationKind.LuaTable)) {
        if (node.arguments && node.arguments.length > 0) {
            throw ForbiddenLuaTableUseException("No parameters are allowed when constructing a LuaTable object.", node);
        } else {
            return lua.createTableExpression();
        }
    }
}
