import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
import { DecoratorKind, getCustomDecorators } from "../utils/decorators";
import { ForbiddenLuaTableSetExpression, ForbiddenLuaTableUseException, UnsupportedProperty } from "../utils/errors";
import { PropertyCallExpression, transformArguments } from "./call";

function validateLuaTableCall(expression: PropertyCallExpression, isWithinExpressionStatement: boolean): void {
    const methodName = expression.expression.name.text;
    if (expression.arguments.some(argument => ts.isSpreadElement(argument))) {
        throw ForbiddenLuaTableUseException("Arguments cannot be spread.", expression);
    }

    switch (methodName) {
        case "get":
            if (expression.arguments.length !== 1) {
                throw ForbiddenLuaTableUseException("One parameter is required for get().", expression);
            }

            break;
        case "set":
            if (expression.arguments.length !== 2) {
                throw ForbiddenLuaTableUseException("Two parameters are required for set().", expression);
            }

            if (!isWithinExpressionStatement) {
                throw ForbiddenLuaTableSetExpression(expression);
            }

            break;
    }
}

function transformLuaTableExpressionStatement(
    context: TransformationContext,
    expression: PropertyCallExpression
): tstl.Statement {
    const methodName = expression.expression.name.text;
    const signature = context.checker.getResolvedSignature(expression);
    const tableName = (expression.expression.expression as ts.Identifier).text;
    const luaTable = tstl.createIdentifier(tableName);
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
            throw ForbiddenLuaTableUseException("Unsupported method.", expression);
    }
}

const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;

    if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
        const ownerType = context.checker.getTypeAtLocation(expression.expression.expression);
        const decorators = getCustomDecorators(context, ownerType);
        if (decorators.has(DecoratorKind.LuaTable)) {
            validateLuaTableCall(expression as PropertyCallExpression, true);
            return transformLuaTableExpressionStatement(context, expression as PropertyCallExpression);
        }
    }

    return context.superTransformStatements(node);
};

function transformLuaTableCallExpression(
    context: TransformationContext,
    node: PropertyCallExpression
): tstl.Expression {
    const method = node.expression;
    const methodName = method.name.text;
    const signature = context.checker.getResolvedSignature(node);
    const tableName = (method.expression as ts.Identifier).text;
    const luaTable = tstl.createIdentifier(tableName);
    const params = transformArguments(context, node.arguments, signature);

    switch (methodName) {
        case "get":
            return tstl.createTableIndexExpression(luaTable, params[0], node);
        default:
            throw ForbiddenLuaTableUseException("Unsupported method.", node);
    }
}

const transformCallExpression: FunctionVisitor<ts.CallExpression> = (node, context) => {
    if (ts.isPropertyAccessExpression(node.expression)) {
        const ownerType = context.checker.getTypeAtLocation(node.expression.expression);
        const classDecorators = getCustomDecorators(context, ownerType);

        if (classDecorators.has(DecoratorKind.LuaTable)) {
            validateLuaTableCall(node as PropertyCallExpression, false);
            return transformLuaTableCallExpression(context, node as PropertyCallExpression);
        }
    }

    return context.superTransformExpression(node);
};

const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression> = (node, context) => {
    const type = context.checker.getTypeAtLocation(node.expression);
    const decorators = getCustomDecorators(context, type);
    if (decorators.has(DecoratorKind.LuaTable)) {
        switch (node.name.text) {
            case "length":
                const propertyAccessExpression = context.transformExpression(node.expression);
                return tstl.createUnaryExpression(propertyAccessExpression, tstl.SyntaxKind.LengthOperator, node);
            default:
                throw UnsupportedProperty("LuaTable", node.name.text, node);
        }
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
        [ts.SyntaxKind.NewExpression]: { transform: transformNewExpression, priority: 1 },
    },
};
