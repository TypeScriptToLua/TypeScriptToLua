import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { ContextType, getFunctionContextType } from "../../../utils/function-context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformFunctionBody, transformParameters } from "../../function";
import { transformPropertyName } from "../../literal";
import { isStaticNode } from "../utils";

export function transformMethodDeclaration(
    context: TransformationContext,
    node: ts.MethodDeclaration,
    className: lua.Identifier,
    noPrototype: boolean
): lua.Statement | undefined {
    // Don't transform methods without body (overload declarations)
    if (!node.body) {
        return undefined;
    }

    let methodName = transformPropertyName(context, node.name);
    if (lua.isStringLiteral(methodName) && methodName.value === "toString") {
        methodName = lua.createStringLiteral("__tostring", node.name);
    }

    const type = context.checker.getTypeAtLocation(node);
    const functionContext =
        getFunctionContextType(context, type) !== ContextType.Void ? createSelfIdentifier() : undefined;
    const [paramNames, dots, restParamName] = transformParameters(context, node.parameters, functionContext);

    const [body] = transformFunctionBody(context, node.parameters, node.body, restParamName);
    const functionExpression = lua.createFunctionExpression(
        lua.createBlock(body),
        paramNames,
        dots,
        restParamName,
        lua.FunctionExpressionFlags.Declaration,
        node.body
    );

    const methodTable =
        isStaticNode(node) || noPrototype
            ? lua.cloneIdentifier(className)
            : lua.createTableIndexExpression(lua.cloneIdentifier(className), lua.createStringLiteral("prototype"));

    return lua.createAssignmentStatement(
        lua.createTableIndexExpression(methodTable, methodName),
        functionExpression,
        node
    );
}
