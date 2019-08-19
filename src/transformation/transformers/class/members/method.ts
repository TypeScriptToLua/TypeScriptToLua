import * as ts from "typescript";
import * as tstl from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { ContextType, getFunctionContextType } from "../../../utils/function-context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformFunctionBody, transformParameters } from "../../function";
import { transformPropertyName } from "../../literal";
import { isStaticNode } from "../utils";

export function transformMethodDeclaration(
    context: TransformationContext,
    node: ts.MethodDeclaration,
    className: tstl.Identifier,
    noPrototype: boolean
): tstl.Statement | undefined {
    // Don't transform methods without body (overload declarations)
    if (!node.body) {
        return undefined;
    }

    let methodName = transformPropertyName(context, node.name);
    if (tstl.isStringLiteral(methodName) && methodName.value === "toString") {
        methodName = tstl.createStringLiteral("__tostring", node.name);
    }

    const type = context.checker.getTypeAtLocation(node);
    const functionContext =
        getFunctionContextType(context, type) !== ContextType.Void ? createSelfIdentifier() : undefined;
    const [paramNames, dots, restParamName] = transformParameters(context, node.parameters, functionContext);

    const [body] = transformFunctionBody(context, node.parameters, node.body, restParamName);
    const functionExpression = tstl.createFunctionExpression(
        tstl.createBlock(body),
        paramNames,
        dots,
        restParamName,
        tstl.FunctionExpressionFlags.Declaration,
        node.body
    );

    const methodTable =
        isStaticNode(node) || noPrototype
            ? tstl.cloneIdentifier(className)
            : tstl.createTableIndexExpression(tstl.cloneIdentifier(className), tstl.createStringLiteral("prototype"));

    return tstl.createAssignmentStatement(
        tstl.createTableIndexExpression(methodTable, methodName),
        functionExpression,
        node
    );
}
