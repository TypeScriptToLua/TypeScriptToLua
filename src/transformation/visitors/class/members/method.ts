import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { transformFunctionToExpression } from "../../function";
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

    const methodTable =
        isStaticNode(node) || noPrototype
            ? lua.cloneIdentifier(className)
            : lua.createTableIndexExpression(lua.cloneIdentifier(className), lua.createStringLiteral("prototype"));

    let methodName = transformPropertyName(context, node.name);
    if (lua.isStringLiteral(methodName) && methodName.value === "toString") {
        methodName = lua.createStringLiteral("__tostring", node.name);
    }

    const [functionExpression] = transformFunctionToExpression(context, node);

    return lua.createAssignmentStatement(
        lua.createTableIndexExpression(methodTable, methodName),
        functionExpression,
        node
    );
}
