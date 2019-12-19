import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { AllAccessorDeclarations, TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { importLuaLibFeature, LuaLibFeature } from "../../../utils/lualib";
import { transformFunctionBody, transformParameters } from "../../function";
import { transformPropertyName } from "../../literal";
import { isStaticNode } from "../utils";

function transformAccessor(context: TransformationContext, node: ts.AccessorDeclaration): lua.FunctionExpression {
    const [params, dot, restParam] = transformParameters(context, node.parameters, createSelfIdentifier());
    const body = node.body ? transformFunctionBody(context, node.parameters, node.body, restParam)[0] : [];
    return lua.createFunctionExpression(
        lua.createBlock(body),
        params,
        dot,
        restParam,
        lua.FunctionExpressionFlags.Declaration
    );
}

export function transformAccessorDeclarations(
    context: TransformationContext,
    { firstAccessor, getAccessor, setAccessor }: AllAccessorDeclarations,
    className: lua.Identifier
): lua.Statement | undefined {
    const propertyName = transformPropertyName(context, firstAccessor.name);
    const descriptor = lua.createTableExpression([]);

    if (getAccessor) {
        const getterFunction = transformAccessor(context, getAccessor);
        descriptor.fields.push(lua.createTableFieldExpression(getterFunction, lua.createStringLiteral("get")));
    }

    if (setAccessor) {
        const setterFunction = transformAccessor(context, setAccessor);
        descriptor.fields.push(lua.createTableFieldExpression(setterFunction, lua.createStringLiteral("set")));
    }

    importLuaLibFeature(context, LuaLibFeature.Descriptors);
    const call = isStaticNode(firstAccessor)
        ? lua.createCallExpression(lua.createIdentifier(`__TS__ObjectDefineProperty`), [
              lua.cloneIdentifier(className),
              propertyName,
              descriptor,
          ])
        : lua.createCallExpression(lua.createIdentifier(`__TS__SetDescriptor`), [
              lua.createTableIndexExpression(lua.cloneIdentifier(className), lua.createStringLiteral("prototype")),
              propertyName,
              descriptor,
          ]);

    return lua.createExpressionStatement(call);
}
