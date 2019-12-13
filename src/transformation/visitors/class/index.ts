import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { getOrUpdate, isNonNull } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import {
    ForbiddenLuaTableNonDeclaration,
    InvalidExportsExtension,
    InvalidExtendsExtension,
    InvalidExtendsLuaTable,
    InvalidExtensionMetaExtension,
    MissingClassName,
    MissingMetaExtension,
    UnknownSuperType,
} from "../../utils/errors";
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
    OneToManyVisitorResult,
    unwrapVisitorResult,
} from "../../utils/lua-ast";
import { createSafeName, isUnsafeName } from "../../utils/safe-names";
import { popScope, pushScope, ScopeType } from "../../utils/scope";
import { isAmbientNode } from "../../utils/typescript";
import { transformIdentifier } from "../identifier";
import { transformPropertyName } from "../literal";
import { createConstructorDecorationStatement } from "./decorators";
import { isGetAccessorOverride, transformAccessorDeclaration } from "./members/accessors";
import { createConstructorName, transformConstructorDeclaration } from "./members/constructor";
import { transformClassInstanceFields } from "./members/fields";
import { transformMethodDeclaration } from "./members/method";
import { checkForLuaLibType } from "./new";
import { createClassSetup } from "./setup";
import { getExtendedType, getExtendedTypeNode, isStaticNode } from "./utils";

export function transformClassAsExpression(
    expression: ts.ClassLikeDeclaration,
    context: TransformationContext,
    isDefaultExport = false
): lua.Expression {
    let className: lua.Identifier;
    if (expression.name) {
        className = transformIdentifier(context, expression.name);
    } else if (isDefaultExport) {
        className = createDefaultExportIdentifier(expression);
    } else {
        className = lua.createAnonymousIdentifier();
    }

    pushScope(context, ScopeType.Function);
    const classDeclaration = unwrapVisitorResult(transformClassDeclaration(expression, context, className));
    popScope(context);

    return createImmediatelyInvokedFunctionExpression(classDeclaration, className, expression);
}

const classStacks = new WeakMap<TransformationContext, ts.ClassLikeDeclaration[]>();

export function transformClassDeclaration(
    classDeclaration: ts.ClassLikeDeclaration,
    context: TransformationContext,
    nameOverride?: lua.Identifier
): OneToManyVisitorResult<lua.Statement> {
    const classStack = getOrUpdate(classStacks, context, () => []);
    classStack.push(classDeclaration);

    let className: lua.Identifier;
    let classNameText: string;
    if (nameOverride !== undefined) {
        className = nameOverride;
        classNameText = nameOverride.text;
    } else if (classDeclaration.name !== undefined) {
        className = transformIdentifier(context, classDeclaration.name);
        classNameText = classDeclaration.name.text;
    } else if (hasDefaultExportModifier(classDeclaration)) {
        const left = createExportedIdentifier(context, createDefaultExportIdentifier(classDeclaration));
        const right = transformClassAsExpression(classDeclaration, context, true);

        return lua.createAssignmentStatement(left, right, classDeclaration);
    } else {
        throw MissingClassName(classDeclaration);
    }

    const annotations = getTypeAnnotations(context, context.checker.getTypeAtLocation(classDeclaration));

    // Find out if this class is extension of existing class
    const extensionDirective = annotations.get(AnnotationKind.Extension);
    const isExtension = extensionDirective !== undefined;
    const isMetaExtension = annotations.has(AnnotationKind.MetaExtension);

    if (isExtension && isMetaExtension) {
        throw InvalidExtensionMetaExtension(classDeclaration);
    }

    if ((isExtension || isMetaExtension) && getIdentifierExportScope(context, className) !== undefined) {
        // Cannot export extension classes
        throw InvalidExportsExtension(classDeclaration);
    }

    // Get type that is extended
    const extendsType = getExtendedType(context, classDeclaration);

    if (extendsType) {
        checkForLuaLibType(context, extendsType);
    }

    if (!(isExtension || isMetaExtension) && extendsType) {
        // Non-extensions cannot extend extension classes
        const extendsAnnotations = getTypeAnnotations(context, extendsType);
        if (extendsAnnotations.has(AnnotationKind.Extension) || extendsAnnotations.has(AnnotationKind.MetaExtension)) {
            throw InvalidExtendsExtension(classDeclaration);
        }
    }

    // You cannot extend LuaTable classes
    if (extendsType) {
        const annotations = getTypeAnnotations(context, extendsType);
        if (annotations.has(AnnotationKind.LuaTable)) {
            throw InvalidExtendsLuaTable(classDeclaration);
        }
    }

    // LuaTable classes must be ambient
    if (annotations.has(AnnotationKind.LuaTable) && !isAmbientNode(classDeclaration)) {
        throw ForbiddenLuaTableNonDeclaration(classDeclaration);
    }

    // Get all properties with value
    const properties = classDeclaration.members.filter(ts.isPropertyDeclaration).filter(member => member.initializer);

    // Divide properties into static and non-static
    const staticFields = properties.filter(isStaticNode);
    const instanceFields = properties.filter(prop => !isStaticNode(prop));

    const result: lua.Statement[] = [];

    // Overwrite the original className with the class we are overriding for extensions
    if (isMetaExtension) {
        if (!extendsType) {
            throw MissingMetaExtension(classDeclaration);
        }

        const extendsName = lua.createStringLiteral(extendsType.symbol.name as string);
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
    }

    if (extensionDirective !== undefined) {
        const [extensionName] = extensionDirective.args;
        if (extensionName) {
            className = lua.createIdentifier(extensionName);
        } else if (extendsType) {
            className = lua.createIdentifier(extendsType.symbol.name);
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
        result.push(
            ...createClassSetup(context, classDeclaration, className, localClassName, classNameText, extendsType)
        );
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
        } else if (!extendsType) {
            // Generate a constructor if none was defined in a base class
            const constructorResult = transformConstructorDeclaration(
                context,
                ts.createConstructor([], [], [], ts.createBlock([], true)),
                localClassName,
                instanceFields,
                classDeclaration
            );

            if (constructorResult) result.push(constructorResult);
        } else if (
            instanceFields.length > 0 ||
            classDeclaration.members.some(m => isGetAccessorOverride(context, m, classDeclaration))
        ) {
            // Generate a constructor if none was defined in a class with instance fields that need initialization
            // localClassName.prototype.____constructor = function(self, ...)
            //     baseClassName.prototype.____constructor(self, ...)
            //     ...
            const constructorBody = transformClassInstanceFields(context, classDeclaration, instanceFields);
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
                undefined,
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
    result.push(
        ...classDeclaration.members
            .filter(ts.isAccessor)
            .map(accessor => transformAccessorDeclaration(context, accessor, localClassName))
            .filter(isNonNull)
    );

    // Transform methods
    result.push(
        ...classDeclaration.members
            .filter(ts.isMethodDeclaration)
            .map(m => transformMethodDeclaration(context, m, localClassName, isExtension || isMetaExtension))
            .filter(isNonNull)
    );

    // Add static declarations
    for (const field of staticFields) {
        const fieldName = transformPropertyName(context, field.name);
        const value = field.initializer ? context.transformExpression(field.initializer) : undefined;

        const classField = lua.createTableIndexExpression(lua.cloneIdentifier(localClassName), fieldName);

        const fieldAssign = lua.createAssignmentStatement(classField, value);

        result.push(fieldAssign);
    }

    const decorationStatement = createConstructorDecorationStatement(context, classDeclaration);
    if (decorationStatement) {
        result.push(decorationStatement);
    }

    classStack.pop();

    return result;
}

export const transformSuperExpression: FunctionVisitor<ts.SuperExpression> = (expression, context) => {
    const classStack = getOrUpdate(classStacks, context, () => []);
    const classDeclaration = classStack[classStack.length - 1];
    const typeNode = getExtendedTypeNode(context, classDeclaration);
    if (typeNode === undefined) {
        throw UnknownSuperType(expression);
    }

    const extendsExpression = typeNode.expression;
    let baseClassName: lua.AssignmentLeftHandSideExpression | undefined;

    if (ts.isIdentifier(extendsExpression)) {
        const symbol = context.checker.getSymbolAtLocation(extendsExpression);
        if (symbol && !isSymbolExported(context, symbol)) {
            // Use "baseClassName" if base is a simple identifier
            baseClassName = transformIdentifier(context, extendsExpression);
        }
    }

    if (!baseClassName) {
        if (classDeclaration.name === undefined) {
            throw MissingClassName(expression);
        }

        // Use "className.____super" if the base is not a simple identifier
        baseClassName = lua.createTableIndexExpression(
            transformIdentifier(context, classDeclaration.name),
            lua.createStringLiteral("____super"),
            expression
        );
    }

    return lua.createTableIndexExpression(baseClassName, lua.createStringLiteral("prototype"));
};

export const transformThisExpression: FunctionVisitor<ts.ThisExpression> = node => createSelfIdentifier(node);
