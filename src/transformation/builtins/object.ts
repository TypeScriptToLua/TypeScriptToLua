import * as lua from "../../LuaAST";
import * as ts from "typescript";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformArguments } from "../visitors/call";

export function transformObjectConstructorCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const args = transformArguments(context, node.arguments);
    const methodName = calledMethod.name.text;

    switch (methodName) {
        case "assign":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectAssign, node, ...args);
        case "defineProperty":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectDefineProperty, node, ...args);
        case "entries":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectEntries, node, ...args);
        case "fromEntries":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectFromEntries, node, ...args);
        case "getOwnPropertyDescriptor":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectGetOwnPropertyDescriptor, node, ...args);
        case "getOwnPropertyDescriptors":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectGetOwnPropertyDescriptors, node, ...args);
        case "keys":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectKeys, node, ...args);
        case "values":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectValues, node, ...args);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "Object", methodName));
    }
}

export function tryTransformObjectPrototypeCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const name = calledMethod.name.text;
    switch (name) {
        case "toString":
            const toStringIdentifier = lua.createIdentifier("tostring");
            return lua.createCallExpression(
                toStringIdentifier,
                [context.transformExpression(calledMethod.expression)],
                node
            );
        case "hasOwnProperty":
            const expr = context.transformExpression(calledMethod.expression);
            const signature = context.checker.getResolvedSignature(node);
            const parameters = transformArguments(context, node.arguments, signature);
            const rawGetIdentifier = lua.createIdentifier("rawget");
            const rawGetCall = lua.createCallExpression(rawGetIdentifier, [expr, ...parameters]);
            return lua.createBinaryExpression(
                rawGetCall,
                lua.createNilLiteral(),
                lua.SyntaxKind.InequalityOperator,
                node
            );
    }
}
