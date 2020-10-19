import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { getOrUpdate } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import {
    extensionAndMetaExtensionConflict,
    extensionCannotExport,
    extensionCannotExtend,
    luaTableCannotBeExtended,
    luaTableMustBeAmbient,
    metaExtensionMissingExtends,
} from "../../utils/diagnostics";
import {
    createDefaultExportIdentifier,
    createExportedIdentifier,
    getIdentifierExportScope,
    hasDefaultExportModifier,
    isSymbolExported,
} from "../../utils/export";
import {
    createImmediatelyInvokedFunctionExpression,
    createSelfIdentifier,
    unwrapVisitorResult,
} from "../../utils/lua-ast";
import { createSafeName, isUnsafeName } from "../../utils/safe-names";
import { popScope, pushScope, ScopeType } from "../../utils/scope";
import { isAmbientNode } from "../../utils/typescript";
import { transformIdentifier } from "../identifier";
import { transformPropertyName } from "../literal";
import { createDecoratingExpression, transformDecoratorExpression } from "./decorators";
import { transformAccessorDeclarations } from "./members/accessors";
import { createConstructorName, transformConstructorDeclaration } from "./members/constructor";
import {
    createPropertyDecoratingExpression,
    transformClassInstanceFields,
    transformStaticPropertyDeclaration,
} from "./members/fields";
import { createMethodDecoratingExpression, transformMethodDeclaration } from "./members/method";
import { checkForLuaLibType } from "./new";
import { createClassSetup } from "./setup";
import { getExtendedNode, getExtendedType, isStaticNode } from "./utils";

export const transformClassDeclaration: FunctionVisitor<ts.ClassLikeDeclaration> = (declaration, context) => {
    // If declaration is a default export, transform to export variable assignment instead
    if (hasDefaultExportModifier(declaration)) {
        const left = createExportedIdentifier(context, createDefaultExportIdentifier(declaration));
        const right = transformClassAsExpression(declaration, context);
        return [lua.createAssignmentStatement(left, right, declaration)];
    }

    const { statements } = transformClassLikeDeclaration(declaration, context);
    return statements;
};

export const transformThisExpression: FunctionVisitor<ts.ThisExpression> = node => createSelfIdentifier(node);

export function transformClassAsExpression(
    expression: ts.ClassLikeDeclaration,
    context: TransformationContext
): lua.Expression {
    pushScope(context, ScopeType.Function);
    const { statements, name } = transformClassLikeDeclaration(expression, context);
    popScope(context);

    return createImmediatelyInvokedFunctionExpression(unwrapVisitorResult(statements), name, expression);
}

const classSuperInfos = new WeakMap<TransformationContext, ClassSuperInfo[]>();
interface ClassSuperInfo {
    className: lua.Identifier;
    extendedTypeNode?: ts.ExpressionWithTypeArguments;
}

function transformClassLikeDeclaration(
    classDeclaration: ts.ClassLikeDeclaration,
    context: TransformationContext,
    nameOverride?: lua.Identifier
): { statements: lua.Statement[]; name: lua.Identifier } {
    let className: lua.Identifier;
    if (nameOverride !== undefined) {
        className = nameOverride;
    } else if (classDeclaration.name !== undefined) {
        className = transformIdentifier(context, classDeclaration.name);
    } else {
        // TypeScript error
        className = lua.createAnonymousIdentifier();
    }

    const annotations = getTypeAnnotations(context.checker.getTypeAtLocation(classDeclaration));

    // Find out if this class is extension of existing class
    const extensionDirective = annotations.get(AnnotationKind.Extension);
    const isExtension = extensionDirective !== undefined;
    const isMetaExtension = annotations.has(AnnotationKind.MetaExtension);

    if (isExtension && isMetaExtension) {
        context.diagnostics.push(extensionAndMetaExtensionConflict(classDeclaration));
    }

    if ((isExtension || isMetaExtension) && getIdentifierExportScope(context, className) !== undefined) {
        // Cannot export extension classes
        context.diagnostics.push(extensionCannotExport(classDeclaration));
    }

    // Get type that is extended
    const extendedTypeNode = getExtendedNode(context, classDeclaration);
    const extendedType = getExtendedType(context, classDeclaration);

    const superInfo = getOrUpdate(classSuperInfos, context, () => []);
    superInfo.push({ className, extendedTypeNode });

    if (extendedType) {
        checkForLuaLibType(context, extendedType);
    }

    if (!(isExtension || isMetaExtension) && extendedType) {
        // Non-extensions cannot extend extension classes
        const extendsAnnotations = getTypeAnnotations(extendedType);
        if (extendsAnnotations.has(AnnotationKind.Extension) || extendsAnnotations.has(AnnotationKind.MetaExtension)) {
            context.diagnostics.push(extensionCannotExtend(classDeclaration));
        }
    }

    // You cannot extend LuaTable classes
    if (extendedType) {
        const annotations = getTypeAnnotations(extendedType);
        if (annotations.has(AnnotationKind.LuaTable)) {
            context.diagnostics.push(luaTableCannotBeExtended(extendedTypeNode!));
        }
    }

    if (annotations.has(AnnotationKind.LuaTable) && !isAmbientNode(classDeclaration)) {
        context.diagnostics.push(luaTableMustBeAmbient(classDeclaration));
    }

    // Get all properties with value
    const properties = classDeclaration.members.filter(ts.isPropertyDeclaration).filter(member => member.initializer);

    // Divide properties into static and non-static
    const instanceFields = properties.filter(prop => !isStaticNode(prop));

    const result: lua.Statement[] = [];

    // Overwrite the original className with the class we are overriding for extensions
    if (isMetaExtension) {
        if (extendedType) {
            const extendsName = lua.createStringLiteral(extendedType.symbol.name);
            className = lua.createIdentifier("__meta__" + extendsName.value);

            // local className = debug.getregistry()["extendsName"]
            const assignDebugCallIndex = lua.createVariableDeclarationStatement(
                className,
                lua.createTableIndexExpression(
                    lua.createCallExpression(
                        lua.createTableIndexExpression(
                            lua.createIdentifier("debug"),
                            lua.createStringLiteral("getregistry")
                        ),
                        []
                    ),
                    extendsName
                ),
                classDeclaration
            );

            result.push(assignDebugCallIndex);
        } else {
            context.diagnostics.push(metaExtensionMissingExtends(classDeclaration));
        }
    }

    if (extensionDirective !== undefined) {
        const [extensionName] = extensionDirective.args;
        if (extensionName) {
            className = lua.createIdentifier(extensionName);
        } else if (extendedType) {
            className = lua.createIdentifier(extendedType.symbol.name);
        }
    }

    let localClassName: lua.Identifier;
    if (isUnsafeName(className.text)) {
        localClassName = lua.createIdentifier(
            createSafeName(className.text),
            undefined,
            className.symbolId,
            className.text
        );
        lua.setNodePosition(localClassName, className);
    } else {
        localClassName = className;
    }

    if (!isExtension && !isMetaExtension) {
        result.push(...createClassSetup(context, classDeclaration, className, localClassName, extendedType));
    } else {
        for (const f of instanceFields) {
            const fieldName = transformPropertyName(context, f.name);

            const value = f.initializer !== undefined ? context.transformExpression(f.initializer) : undefined;

            // className["fieldName"]
            const classField = lua.createTableIndexExpression(lua.cloneIdentifier(className), fieldName);

            // className["fieldName"] = value;
            const assignClassField = lua.createAssignmentStatement(classField, value);

            result.push(assignClassField);
        }
    }

    // Find first constructor with body
    if (!isExtension && !isMetaExtension) {
        const constructor = classDeclaration.members.find(
            (n): n is ts.ConstructorDeclaration => ts.isConstructorDeclaration(n) && n.body !== undefined
        );

        if (constructor) {
            // Add constructor plus initialization of instance fields
            const constructorResult = transformConstructorDeclaration(
                context,
                constructor,
                localClassName,
                instanceFields,
                classDeclaration
            );

            if (constructorResult) result.push(constructorResult);
        } else if (!extendedType) {
            // Generate a constructor if none was defined in a base class
            const constructorResult = transformConstructorDeclaration(
                context,
                ts.createConstructor([], [], [], ts.createBlock([], true)),
                localClassName,
                instanceFields,
                classDeclaration
            );

            if (constructorResult) result.push(constructorResult);
        } else if (instanceFields.length > 0) {
            // Generate a constructor if none was defined in a class with instance fields that need initialization
            // localClassName.prototype.____constructor = function(self, ...)
            //     baseClassName.prototype.____constructor(self, ...)
            //     ...
            const constructorBody = transformClassInstanceFields(context, instanceFields);
            const superCall = lua.createExpressionStatement(
                lua.createCallExpression(
                    lua.createTableIndexExpression(
                        context.transformExpression(ts.createSuper()),
                        lua.createStringLiteral("____constructor")
                    ),
                    [createSelfIdentifier(), lua.createDotsLiteral()]
                )
            );
            constructorBody.unshift(superCall);
            const constructorFunction = lua.createFunctionExpression(
                lua.createBlock(constructorBody),
                [createSelfIdentifier()],
                lua.createDotsLiteral(),
                lua.FunctionExpressionFlags.Declaration
            );
            result.push(
                lua.createAssignmentStatement(
                    createConstructorName(localClassName),
                    constructorFunction,
                    classDeclaration
                )
            );
        }
    }

    // Transform accessors
    for (const member of classDeclaration.members) {
        if (!ts.isAccessor(member)) continue;
        const accessors = context.resolver.getAllAccessorDeclarations(member);
        if (accessors.firstAccessor !== member) continue;

        const accessorsResult = transformAccessorDeclarations(context, accessors, localClassName);
        if (accessorsResult) {
            result.push(accessorsResult);
        }
    }

    const noPrototype = isExtension || isMetaExtension;
    const decorationStatements: lua.Statement[] = [];

    for (const member of classDeclaration.members) {
        if (ts.isAccessor(member)) {
            const expression = createPropertyDecoratingExpression(context, member, localClassName, noPrototype);
            if (expression) decorationStatements.push(lua.createExpressionStatement(expression));
        } else if (ts.isMethodDeclaration(member)) {
            const statement = transformMethodDeclaration(context, member, localClassName, noPrototype);
            if (statement) result.push(statement);
            if (member.body) {
                const statement = createMethodDecoratingExpression(context, member, localClassName, noPrototype);
                if (statement) decorationStatements.push(statement);
            }
        } else if (ts.isPropertyDeclaration(member)) {
            if (isStaticNode(member)) {
                const statement = transformStaticPropertyDeclaration(context, member, localClassName);
                if (statement) decorationStatements.push(statement);
            }
            const expression = createPropertyDecoratingExpression(context, member, localClassName, noPrototype);
            if (expression) decorationStatements.push(lua.createExpressionStatement(expression));
        }
    }

    result.push(...decorationStatements);

    // Decorate the class
    if (classDeclaration.decorators) {
        const decoratingExpression = createDecoratingExpression(
            context,
            classDeclaration.kind,
            classDeclaration.decorators.map(d => transformDecoratorExpression(context, d)),
            localClassName
        );
        const decoratingStatement = lua.createAssignmentStatement(localClassName, decoratingExpression);
        result.push(decoratingStatement);
    }

    superInfo.pop();

    return { statements: result, name: className };
}

export const transformSuperExpression: FunctionVisitor<ts.SuperExpression> = (expression, context) => {
    const superInfos = getOrUpdate(classSuperInfos, context, () => []);
    const superInfo = superInfos[superInfos.length - 1];
    if (!superInfo) return lua.createAnonymousIdentifier(expression);
    const { className, extendedTypeNode } = superInfo;

    // Using `super` without extended type node is a TypeScript error
    const extendsExpression = extendedTypeNode?.expression;
    let baseClassName: lua.AssignmentLeftHandSideExpression | undefined;

    if (extendsExpression && ts.isIdentifier(extendsExpression)) {
        const symbol = context.checker.getSymbolAtLocation(extendsExpression);
        if (symbol && !isSymbolExported(context, symbol)) {
            // Use "baseClassName" if base is a simple identifier
            baseClassName = transformIdentifier(context, extendsExpression);
        }
    }

    if (!baseClassName) {
        // Use "className.____super" if the base is not a simple identifier
        baseClassName = lua.createTableIndexExpression(className, lua.createStringLiteral("____super"), expression);
    }

    return lua.createTableIndexExpression(baseClassName, lua.createStringLiteral("prototype"));
};
