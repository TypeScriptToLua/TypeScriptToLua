import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { decoratorInvalidContext, incompleteFieldDecoratorWarning } from "../../utils/diagnostics";
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
    const classDecorators =
        ts.getDecorators(classDeclaration)?.map(d => transformDecoratorExpression(context, d)) ?? [];

    // If experimentalDecorators flag is set, decorate with legacy decorator logic
    if (context.options.experimentalDecorators) {
        return createLegacyDecoratingExpression(context, classDeclaration.kind, classDecorators, className);
    }

    // Else: TypeScript 5.0 decorator
    return createDecoratingExpression(context, className, className, classDecorators, {
        kind: lua.createStringLiteral("class"),
        name: lua.createStringLiteral(classDeclaration.name?.getText() ?? ""),
    });
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

export function createClassAccessorDecoratingExpression(
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
        kind: lua.createStringLiteral(accessor.kind === ts.SyntaxKind.SetAccessor ? "setter" : "getter"),
        name: propertyName,
        private: lua.createBooleanLiteral(isPrivateNode(accessor)),
        static: lua.createBooleanLiteral(isStaticNode(accessor)),
    });
}

export function createClassPropertyDecoratingExpression(
    context: TransformationContext,
    property: ts.PropertyDeclaration,
    className: lua.Identifier
): lua.Expression {
    const decorators = ts.getDecorators(property) ?? [];
    const propertyDecorators = decorators.map(d => transformDecoratorExpression(context, d));

    // If experimentalDecorators flag is set, decorate with legacy decorator logic
    if (context.options.experimentalDecorators) {
        const propertyName = transformPropertyName(context, property.name);
        const propertyOwnerTable = transformMemberExpressionOwnerName(property, className);

        return createLegacyDecoratingExpression(
            context,
            property.kind,
            propertyDecorators,
            propertyOwnerTable,
            propertyName
        );
    }

    // Else: TypeScript 5.0 decorator

    // Add a diagnostic when something is returned from a field decorator
    for (const decorator of decorators) {
        const signature = context.checker.getResolvedSignature(decorator);
        const decoratorReturnType = signature?.getReturnType();
        // If return type of decorator is NOT void
        if (decoratorReturnType && (decoratorReturnType.flags & ts.TypeFlags.Void) === 0) {
            context.diagnostics.push(incompleteFieldDecoratorWarning(property));
        }
    }

    return createDecoratingExpression(context, className, lua.createNilLiteral(), propertyDecorators, {
        kind: lua.createStringLiteral("field"),
        name: lua.createStringLiteral(property.name.getText()),
        private: lua.createBooleanLiteral(isPrivateNode(property)),
        static: lua.createBooleanLiteral(isStaticNode(property)),
    });
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
