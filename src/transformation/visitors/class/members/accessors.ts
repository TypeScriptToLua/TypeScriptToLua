import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { AllAccessorDeclarations, TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../../utils/lualib";
import { transformFunctionBody, transformParameters } from "../../function";
import { transformPropertyName } from "../../literal";
import { isStaticNode } from "../utils";
import { createPrototypeName } from "./constructor";
import { createClassAccessorDecoratingExpression } from "../decorators";

function transformAccessor(
    context: TransformationContext,
    node: ts.AccessorDeclaration,
    className: lua.Identifier
): lua.Expression {
    const [params, dot, restParam] = transformParameters(context, node.parameters, createSelfIdentifier());
    const body = node.body ? transformFunctionBody(context, node.parameters, node.body, restParam)[0] : [];
    const accessorFunction = lua.createFunctionExpression(
        lua.createBlock(body),
        params,
        dot,
        lua.NodeFlags.Declaration
    );

    if (ts.getDecorators(node)?.length) {
        return createClassAccessorDecoratingExpression(context, node, accessorFunction, className);
    } else {
        return accessorFunction;
    }
}

export function transformAccessorDeclarations(
    context: TransformationContext,
    { firstAccessor, getAccessor, setAccessor }: AllAccessorDeclarations,
    className: lua.Identifier
): lua.Statement | undefined {
    const propertyName = transformPropertyName(context, firstAccessor.name);
    const descriptor = lua.createTableExpression([]);

    if (getAccessor) {
        const getterFunction = transformAccessor(context, getAccessor, className);
        descriptor.fields.push(lua.createTableFieldExpression(getterFunction, lua.createStringLiteral("get")));
    }

    if (setAccessor) {
        const setterFunction = transformAccessor(context, setAccessor, className);
        descriptor.fields.push(lua.createTableFieldExpression(setterFunction, lua.createStringLiteral("set")));
    }

    const isStatic = isStaticNode(firstAccessor);
    const target = isStatic ? lua.cloneIdentifier(className) : createPrototypeName(className);
    const feature = isStatic ? LuaLibFeature.ObjectDefineProperty : LuaLibFeature.SetDescriptor;
    const parameters: lua.Expression[] = [target, propertyName, descriptor];
    if (!isStatic) parameters.push(lua.createBooleanLiteral(true));
    const call = transformLuaLibFunction(context, feature, undefined, ...parameters);
    return lua.createExpressionStatement(call);
}
