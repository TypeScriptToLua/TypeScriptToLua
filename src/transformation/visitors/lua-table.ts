import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { luaTableCannotBeAccessedDynamically, luaTableForbiddenUsage, unsupportedProperty } from "../utils/diagnostics";
import { transformArguments } from "./call";

const parseLuaTableExpression = (context: TransformationContext, node: ts.PropertyAccessExpression) =>
    [context.transformExpression(node.expression), node.name.text] as const;

function validateLuaTableCall(
    context: TransformationContext,
    node: ts.Node,
    methodName: string,
    callArguments: ts.NodeArray<ts.Expression>
): void {
    for (const argument of callArguments) {
        if (ts.isSpreadElement(argument)) {
            context.diagnostics.push(luaTableForbiddenUsage(argument, "Arguments cannot be spread"));
            return;
        }
    }

    switch (methodName) {
        case "get":
            if (callArguments.length !== 1) {
                context.diagnostics.push(
                    luaTableForbiddenUsage(node, `Expected 1 arguments, but got ${callArguments.length}`)
                );
            }
            break;

        case "set":
            if (callArguments.length !== 2) {
                context.diagnostics.push(
                    luaTableForbiddenUsage(node, `Expected 2 arguments, but got ${callArguments.length}`)
                );
            }
            break;
    }
}

export function transformLuaTableExpressionStatement(
    context: TransformationContext,
    node: ts.ExpressionStatement
): lua.Statement | undefined {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;

    if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression)) return;

    const ownerType = context.checker.getTypeAtLocation(expression.expression.expression);
    const annotations = getTypeAnnotations(ownerType);
    if (!annotations.has(AnnotationKind.LuaTable)) return;

    const [luaTable, methodName] = parseLuaTableExpression(context, expression.expression);
    validateLuaTableCall(context, expression, methodName, expression.arguments);
    const signature = context.checker.getResolvedSignature(expression);
    const params = transformArguments(context, expression.arguments, signature);

    switch (methodName) {
        case "get":
            return lua.createVariableDeclarationStatement(
                lua.createAnonymousIdentifier(expression),
                lua.createTableIndexExpression(luaTable, params[0] ?? lua.createNilLiteral(), expression),
                expression
            );
        case "set":
            return lua.createAssignmentStatement(
                lua.createTableIndexExpression(luaTable, params[0] ?? lua.createNilLiteral(), expression),
                [params[1] ?? lua.createNilLiteral()],
                expression
            );
        default:
            context.diagnostics.push(unsupportedProperty(expression.expression.name, "LuaTable", methodName));
    }
}

export function transformLuaTableCallExpression(
    context: TransformationContext,
    node: ts.CallExpression
): lua.Expression | undefined {
    if (!ts.isPropertyAccessExpression(node.expression)) return;

    const ownerType = context.checker.getTypeAtLocation(node.expression.expression);
    const annotations = getTypeAnnotations(ownerType);
    if (!annotations.has(AnnotationKind.LuaTable)) return;

    const [luaTable, methodName] = parseLuaTableExpression(context, node.expression);
    validateLuaTableCall(context, node, methodName, node.arguments);
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    switch (methodName) {
        case "get":
            return lua.createTableIndexExpression(luaTable, params[0] ?? lua.createNilLiteral(), node);
        default:
            context.diagnostics.push(unsupportedProperty(node.expression.name, "LuaTable", methodName));
    }
}

export function transformLuaTablePropertyAccessExpression(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const annotations = getTypeAnnotations(context.checker.getTypeAtLocation(node.expression));
    if (!annotations.has(AnnotationKind.LuaTable)) return;

    const [luaTable, propertyName] = parseLuaTableExpression(context, node);
    if (propertyName === "length") {
        return lua.createUnaryExpression(luaTable, lua.SyntaxKind.LengthOperator, node);
    }

    context.diagnostics.push(unsupportedProperty(node.name, "LuaTable", propertyName));
}

export function transformLuaTablePropertyAccessInAssignment(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.AssignmentLeftHandSideExpression | undefined {
    if (!ts.isPropertyAccessExpression(node)) return;

    const annotations = getTypeAnnotations(context.checker.getTypeAtLocation(node.expression));
    if (!annotations.has(AnnotationKind.LuaTable)) return;

    const [luaTable, propertyName] = parseLuaTableExpression(context, node);
    if (propertyName === "length") {
        context.diagnostics.push(luaTableForbiddenUsage(node, "A LuaTable object's length cannot be re-assigned"));
        return lua.createTableIndexExpression(luaTable, lua.createStringLiteral(propertyName), node);
    }

    context.diagnostics.push(unsupportedProperty(node.name, "LuaTable", propertyName));
}

export function validateLuaTableElementAccessExpression(
    context: TransformationContext,
    node: ts.ElementAccessExpression
): void {
    const annotations = getTypeAnnotations(context.checker.getTypeAtLocation(node.expression));
    if (annotations.has(AnnotationKind.LuaTable)) {
        context.diagnostics.push(luaTableCannotBeAccessedDynamically(node));
    }
}

export function transformLuaTableNewExpression(
    context: TransformationContext,
    node: ts.NewExpression
): lua.Expression | undefined {
    const annotations = getTypeAnnotations(context.checker.getTypeAtLocation(node));
    if (!annotations.has(AnnotationKind.LuaTable)) return;

    if (node.arguments && node.arguments.length > 0) {
        context.diagnostics.push(
            luaTableForbiddenUsage(node, "No parameters are allowed when constructing a LuaTable object")
        );
    }

    return lua.createTableExpression();
}
