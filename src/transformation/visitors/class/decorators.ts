import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { decoratorInvalidContext } from "../../utils/diagnostics";
import { ContextType, getFunctionContextType } from "../../utils/function-context";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isNonNull } from "../../../utils";
import { transformMemberExpressionOwnerName, transformMethodName } from "./members/method";
import { transformPropertyName } from "../literal";
import { isPrivateNode, isStaticNode } from "./utils";

export function transformDecoratorExpression(context: TransformationContext, decorator: ts.Decorator): lua.Expression {
    const expression = decorator.expression;
    const type = context.checker.getTypeAtLocation(expression);
    const callContext = getFunctionContextType(context, type);
    if (callContext === ContextType.Void) {
        context.diagnostics.push(decoratorInvalidContext(decorator));
    }

    return context.transformExpression(expression);
}

export function createClassDecoratingExpression(
    context: TransformationContext,
    classDeclaration: ts.ClassDeclaration | ts.ClassExpression,
    className: lua.Expression
): lua.Expression {
    // If experimentalDecorators flag is set, decorate with legacy decorator logic
    if (context.options.experimentalDecorators) {
        return createLegacyDecoratingExpression(
            context,
            classDeclaration.kind,
            ts.getDecorators(classDeclaration)?.map(d => transformDecoratorExpression(context, d)) ?? [],
            className
        );
    }

    // Else: TypeScript 5.0 decorator
    return lua.createNilLiteral();
}

export function createClassMethodDecoratingExpression(
    context: TransformationContext,
    methodDeclaration: ts.MethodDeclaration,
    originalMethod: lua.Expression,
    className: lua.Identifier
): lua.Expression {
    const parameterDecorators = getParameterDecorators(context, methodDeclaration);
    const methodDecorators =
        ts.getDecorators(methodDeclaration)?.map(d => transformDecoratorExpression(context, d)) ?? [];

    const methodName = transformMethodName(context, methodDeclaration);

    // If experimentalDecorators flag is set, decorate with legacy decorator logic
    if (context.options.experimentalDecorators) {
        const methodTable = transformMemberExpressionOwnerName(methodDeclaration, className);
        return createLegacyDecoratingExpression(
            context,
            methodDeclaration.kind,
            [...methodDecorators, ...parameterDecorators],
            methodTable,
            methodName
        );
    }

    // Else: TypeScript 5.0 decorator
    return createDecoratingExpression(context, className, originalMethod, methodDecorators, {
        kind: lua.createStringLiteral("method"),
        name: methodName,
        private: lua.createBooleanLiteral(isPrivateNode(methodDeclaration)),
        static: lua.createBooleanLiteral(isStaticNode(methodDeclaration)),
    });
}

export function createClassAccessorDecoratingStatements(
    context: TransformationContext,
    accessor: ts.AccessorDeclaration,
    originalAccessor: lua.Expression,
    className: lua.Identifier
): lua.Expression {
    const accessorDecorators = ts.getDecorators(accessor)?.map(d => transformDecoratorExpression(context, d)) ?? [];
    const propertyName = transformPropertyName(context, accessor.name);

    // If experimentalDecorators flag is set, decorate with legacy decorator logic
    if (context.options.experimentalDecorators) {
        const propertyOwnerTable = transformMemberExpressionOwnerName(accessor, className);

        return createLegacyDecoratingExpression(
            context,
            accessor.kind,
            accessorDecorators,
            propertyOwnerTable,
            propertyName
        );
    }

    // Else: TypeScript 5.0 decorator
    return createDecoratingExpression(context, className, originalAccessor, accessorDecorators, {
        kind: lua.createStringLiteral("accessor"),
        name: propertyName,
        private: lua.createBooleanLiteral(isPrivateNode(accessor)),
        static: lua.createBooleanLiteral(isStaticNode(accessor)),
    });
}

export function createClassPropertyDecoratingStatements(
    context: TransformationContext,
    property: ts.PropertyDeclaration,
    className: lua.Identifier
): lua.Statement[] {
    const propertyDecorators = ts.getDecorators(property)?.map(d => transformDecoratorExpression(context, d)) ?? [];
    if (propertyDecorators.length === 0) return [];

    // If experimentalDecorators flag is set, decorate with legacy decorator logic
    if (context.options.experimentalDecorators) {
        const propertyName = transformPropertyName(context, property.name);
        const propertyOwnerTable = transformMemberExpressionOwnerName(property, className);

        return [
            lua.createExpressionStatement(
                createLegacyDecoratingExpression(
                    context,
                    property.kind,
                    propertyDecorators,
                    propertyOwnerTable,
                    propertyName
                )
            ),
        ];
    }

    // Else: TypeScript 5.0 decorator
    const decoratorTable = lua.createTableExpression(propertyDecorators.map(d => lua.createTableFieldExpression(d)));
    const decoratorContext = lua.createTableExpression([
        lua.createTableFieldExpression(lua.createStringLiteral("field"), lua.createStringLiteral("kind")),
    ]);
    const decorateCall = transformLuaLibFunction(
        context,
        LuaLibFeature.Decorate,
        undefined,
        className,
        decoratorTable,
        decoratorContext
    );

    return [lua.createExpressionStatement(decorateCall)];
}

function createDecoratingExpression<TValue extends lua.Expression>(
    context: TransformationContext,
    className: lua.Expression,
    originalValue: TValue,
    decorators: lua.Expression[],
    decoratorContext: Record<string, lua.Expression>
): lua.Expression {
    const decoratorTable = lua.createTableExpression(decorators.map(d => lua.createTableFieldExpression(d)));
    const decoratorContextTable = objectToLuaTableLiteral(decoratorContext);

    return transformLuaLibFunction(
        context,
        LuaLibFeature.Decorate,
        undefined,
        className,
        originalValue,
        decoratorTable,
        decoratorContextTable
    );
}

function objectToLuaTableLiteral(obj: Record<string, lua.Expression>): lua.Expression {
    return lua.createTableExpression(
        Object.entries(obj).map(([key, value]) => lua.createTableFieldExpression(value, lua.createStringLiteral(key)))
    );
}

// Legacy decorators:
function createLegacyDecoratingExpression(
    context: TransformationContext,
    kind: ts.SyntaxKind,
    decorators: lua.Expression[],
    targetTableName: lua.Expression,
    targetFieldExpression?: lua.Expression
): lua.Expression {
    const decoratorTable = lua.createTableExpression(decorators.map(e => lua.createTableFieldExpression(e)));
    const trailingExpressions = [decoratorTable, targetTableName];

    if (targetFieldExpression) {
        trailingExpressions.push(targetFieldExpression);
        const isMethodOrAccessor =
            kind === ts.SyntaxKind.MethodDeclaration ||
            kind === ts.SyntaxKind.GetAccessor ||
            kind === ts.SyntaxKind.SetAccessor;
        trailingExpressions.push(isMethodOrAccessor ? lua.createBooleanLiteral(true) : lua.createNilLiteral());
    }

    return transformLuaLibFunction(context, LuaLibFeature.DecorateLegacy, undefined, ...trailingExpressions);
}

function getParameterDecorators(
    context: TransformationContext,
    node: ts.FunctionLikeDeclarationBase
): lua.CallExpression[] {
    return node.parameters
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
}

export function createConstructorDecoratingExpression(
    context: TransformationContext,
    node: ts.ConstructorDeclaration,
    className: lua.Identifier
): lua.Statement | undefined {
    const parameterDecorators = getParameterDecorators(context, node);

    if (parameterDecorators.length > 0) {
        const decorateMethod = createLegacyDecoratingExpression(context, node.kind, parameterDecorators, className);
        return lua.createExpressionStatement(decorateMethod);
    }
}
