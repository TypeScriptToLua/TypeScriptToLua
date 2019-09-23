import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
import { DecoratorKind, getCustomDecorators } from "../utils/decorators";
import { ForbiddenLuaTableUseException, UnsupportedKind, UnsupportedProperty } from "../utils/errors";
import { transformArguments } from "./call";

function parseLuaTableExpression(
    context: TransformationContext,
    node: ts.LeftHandSideExpression
): [tstl.Expression, string] {
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
): tstl.Statement {
    const [luaTable, methodName] = parseLuaTableExpression(context, expression.expression);
    validateLuaTableCall(methodName, expression.arguments, expression);
    const signature = context.checker.getResolvedSignature(expression);
    const params = transformArguments(context, expression.arguments, signature);

    switch (methodName) {
        case "get":
            return tstl.createVariableDeclarationStatement(
                tstl.createAnonymousIdentifier(expression),
                tstl.createTableIndexExpression(luaTable, params[0], expression),
                expression
            );
        case "set":
            return tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(luaTable, params[0], expression),
                params.splice(1),
                expression
            );
        default:
            throw UnsupportedProperty("LuaTable", methodName, expression);
    }
}

const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;

    if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
        const ownerType = context.checker.getTypeAtLocation(expression.expression.expression);
        const decorators = getCustomDecorators(context, ownerType);
        if (decorators.has(DecoratorKind.LuaTable)) {
            return transformLuaTableExpressionAsExpressionStatement(context, expression);
        }
    }

    return context.superTransformStatements(node);
};

function transformLuaTableCallExpression(
    context: TransformationContext,
    expression: ts.CallExpression
): tstl.Expression {
    const [luaTable, methodName] = parseLuaTableExpression(context, expression.expression);
    validateLuaTableCall(methodName, expression.arguments, expression);
    const signature = context.checker.getResolvedSignature(expression);
    const params = transformArguments(context, expression.arguments, signature);

    switch (methodName) {
        case "get":
            return tstl.createTableIndexExpression(luaTable, params[0], expression);
        default:
            throw UnsupportedProperty("LuaTable", methodName, expression);
    }
}

const transformCallExpression: FunctionVisitor<ts.CallExpression> = (node, context) => {
    if (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) {
        const ownerType = context.checker.getTypeAtLocation(node.expression.expression);
        const classDecorators = getCustomDecorators(context, ownerType);

        if (classDecorators.has(DecoratorKind.LuaTable)) {
            return transformLuaTableCallExpression(context, node);
        }
    }

    return context.superTransformExpression(node);
};

const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression> = (node, context) => {
    const type = context.checker.getTypeAtLocation(node.expression);
    const decorators = getCustomDecorators(context, type);
    if (decorators.has(DecoratorKind.LuaTable)) {
        const [luaTable, propertyName] = parseLuaTableExpression(context, node);
        switch (node.name.text) {
            case "length":
                return tstl.createUnaryExpression(luaTable, tstl.SyntaxKind.LengthOperator, node);
            default:
                throw UnsupportedProperty("LuaTable", propertyName, node);
        }
    }

    return context.superTransformExpression(node);
};

const transformElementAccessExpression: FunctionVisitor<ts.ElementAccessExpression> = (node, context) => {
    const decorators = getCustomDecorators(context, context.checker.getTypeAtLocation(node.expression));
    if (decorators.has(DecoratorKind.LuaTable)) {
        throw UnsupportedKind("LuaTable access expression", node.kind, node);
    }

    return context.superTransformExpression(node);
};

const transformNewExpression: FunctionVisitor<ts.NewExpression> = (node, context) => {
    const type = context.checker.getTypeAtLocation(node);
    const decorators = getCustomDecorators(context, type);
    if (decorators.has(DecoratorKind.LuaTable)) {
        if (node.arguments && node.arguments.length > 0) {
            throw ForbiddenLuaTableUseException("No parameters are allowed when constructing a LuaTable object.", node);
        } else {
            return tstl.createTableExpression();
        }
    }

    return context.superTransformExpression(node);
};

export const luaTablePlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.ExpressionStatement]: { transform: transformExpressionStatement, priority: 1 },
        [ts.SyntaxKind.CallExpression]: { transform: transformCallExpression, priority: 1 },
        [ts.SyntaxKind.PropertyAccessExpression]: { transform: transformPropertyAccessExpression, priority: 1 },
        [ts.SyntaxKind.ElementAccessExpression]: { transform: transformElementAccessExpression, priority: 1 },
        [ts.SyntaxKind.NewExpression]: { transform: transformNewExpression, priority: 1 },
    },
};
