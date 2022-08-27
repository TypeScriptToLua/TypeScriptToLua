import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { transformFunctionToExpression } from "../../function";
import { transformPropertyName } from "../../literal";
import { isStaticNode } from "../utils";
import { createDecoratingExpression, transformDecoratorExpression } from "../decorators";
import { createPrototypeName } from "./constructor";
import { transformLuaLibFunction, LuaLibFeature } from "../../../utils/lualib";
import { isNonNull } from "../../../../utils";

export function transformMemberExpressionOwnerName(
    node: ts.PropertyDeclaration | ts.MethodDeclaration | ts.AccessorDeclaration,
    className: lua.Identifier
): lua.Expression {
    return isStaticNode(node) ? lua.cloneIdentifier(className) : createPrototypeName(className);
}

export function transformMethodName(context: TransformationContext, node: ts.MethodDeclaration): lua.Expression {
    const methodName = transformPropertyName(context, node.name);
    if (lua.isStringLiteral(methodName) && methodName.value === "toString") {
        return lua.createStringLiteral("__tostring", node.name);
    }
    return methodName;
}

export function transformMethodDeclaration(
    context: TransformationContext,
    node: ts.MethodDeclaration,
    className: lua.Identifier
): lua.Statement | undefined {
    // Don't transform methods without body (overload declarations)
    if (!node.body) return;

    const methodTable = transformMemberExpressionOwnerName(node, className);
    const methodName = transformMethodName(context, node);
    const [functionExpression] = transformFunctionToExpression(context, node);

    return lua.createAssignmentStatement(
        lua.createTableIndexExpression(methodTable, methodName),
        functionExpression,
        node
    );
}

export function createMethodDecoratingExpression(
    context: TransformationContext,
    node: ts.MethodDeclaration,
    className: lua.Identifier
): lua.Statement | undefined {
    const methodTable = transformMemberExpressionOwnerName(node, className);
    const methodName = transformMethodName(context, node);

    const parameterDecorators = node.parameters
        .flatMap((parameter, index) =>
            ts
                .getDecorators(parameter)
                ?.map(decorator =>
                    transformLuaLibFunction(
                        context,
                        LuaLibFeature.DecorateParam,
                        node,
                        lua.createNumericLiteral(index),
                        transformDecoratorExpression(context, decorator)
                    )
                )
        )
        .filter(isNonNull);

    const methodDecorators = ts.getDecorators(node)?.map(d => transformDecoratorExpression(context, d)) ?? [];

    if (methodDecorators.length > 0 || parameterDecorators.length > 0) {
        const decorateMethod = createDecoratingExpression(
            context,
            node.kind,
            [...methodDecorators, ...parameterDecorators],
            methodTable,
            methodName
        );
        return lua.createExpressionStatement(decorateMethod);
    }
}
