import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { getOrUpdate, isNonNull } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import {
    ForbiddenLuaTableNonDeclaration,
    ForbiddenStaticClassPropertyName,
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
import { createClassCreationMethods } from "./creation";
import { createConstructorDecorationStatement } from "./decorators";
import { isGetAccessorOverride, transformAccessorDeclaration } from "./members/accessors";
import { createConstructorName, transformConstructorDeclaration } from "./members/constructor";
import { transformClassInstanceFields } from "./members/fields";
import { transformMethodDeclaration } from "./members/method";
import { checkForLuaLibType } from "./new";
import { getExtendedType, getExtendedTypeNode, isStaticNode } from "./utils";

export function transformClassAsExpression(
    expression: ts.ClassLikeDeclaration,
    context: TransformationContext,
    isDefaultExport = false
): tstl.Expression {
    let className: tstl.Identifier;
    if (expression.name) {
        className = transformIdentifier(context, expression.name);
    } else if (isDefaultExport) {
        className = createDefaultExportIdentifier(expression);
    } else {
        className = tstl.createAnonymousIdentifier();
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
    nameOverride?: tstl.Identifier
): OneToManyVisitorResult<tstl.Statement> {
    const classStack = getOrUpdate(classStacks, context, () => []);
    classStack.push(classDeclaration);

    let className: tstl.Identifier;
    let classNameText: string;
    if (nameOverride !== undefined) {
        className = nameOverride;
        classNameText = nameOverride.text;
    } else if (classDeclaration.name !== undefined) {
        className = transformIdentifier(context, classDeclaration.name);
        classNameText = classDeclaration.name.text;
    } else {
        const isDefaultExport = hasDefaultExportModifier(classDeclaration);
        if (isDefaultExport) {
            const left = createExportedIdentifier(context, createDefaultExportIdentifier(classDeclaration));
            const right = transformClassAsExpression(classDeclaration, context, true);

            return tstl.createAssignmentStatement(left, right, classDeclaration);
        } else {
            throw MissingClassName(classDeclaration);
        }
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

    for (const member of classDeclaration.members) {
        if (member.name && (ts.isStringLiteral(member.name) || ts.isIdentifier(member.name))) {
            if (isStaticNode(member) && member.name.text === "new") {
                throw ForbiddenStaticClassPropertyName(member, member.name.text);
            }
        }
    }

    // Get all properties with value
    const properties = classDeclaration.members.filter(ts.isPropertyDeclaration).filter(member => member.initializer);

    // Divide properties into static and non-static
    const staticFields = properties.filter(isStaticNode);
    const instanceFields = properties.filter(prop => !isStaticNode(prop));

    const result: tstl.Statement[] = [];

    // Overwrite the original className with the class we are overriding for extensions
    if (isMetaExtension) {
        if (!extendsType) {
            throw MissingMetaExtension(classDeclaration);
        }

        const extendsName = tstl.createStringLiteral(extendsType.symbol.name as string);
        className = tstl.createIdentifier("__meta__" + extendsName.value);

        // local className = debug.getregistry()["extendsName"]
        const assignDebugCallIndex = tstl.createVariableDeclarationStatement(
            className,
            tstl.createTableIndexExpression(
                tstl.createCallExpression(
                    tstl.createTableIndexExpression(
                        tstl.createIdentifier("debug"),
                        tstl.createStringLiteral("getregistry")
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
            className = tstl.createIdentifier(extensionName);
        } else if (extendsType) {
            className = tstl.createIdentifier(extendsType.symbol.name);
        }
    }

    let localClassName: tstl.Identifier;
    if (isUnsafeName(className.text)) {
        localClassName = tstl.createIdentifier(
            createSafeName(className.text),
            undefined,
            className.symbolId,
            className.text
        );
        tstl.setNodePosition(localClassName, className);
    } else {
        localClassName = className;
    }

    if (!isExtension && !isMetaExtension) {
        const classCreationMethods = createClassCreationMethods(
            context,
            classDeclaration,
            className,
            localClassName,
            classNameText,
            extendsType
        );
        result.push(...classCreationMethods);
    } else {
        for (const f of instanceFields) {
            const fieldName = transformPropertyName(context, f.name);

            const value = f.initializer !== undefined ? context.transformExpression(f.initializer) : undefined;

            // className["fieldName"]
            const classField = tstl.createTableIndexExpression(tstl.cloneIdentifier(className), fieldName);

            // className["fieldName"] = value;
            const assignClassField = tstl.createAssignmentStatement(classField, value);

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
            const superCall = tstl.createExpressionStatement(
                tstl.createCallExpression(
                    tstl.createTableIndexExpression(
                        context.transformExpression(ts.createSuper()),
                        tstl.createStringLiteral("____constructor")
                    ),
                    [createSelfIdentifier(), tstl.createDotsLiteral()]
                )
            );
            constructorBody.unshift(superCall);
            const constructorFunction = tstl.createFunctionExpression(
                tstl.createBlock(constructorBody),
                [createSelfIdentifier()],
                tstl.createDotsLiteral(),
                undefined,
                tstl.FunctionExpressionFlags.Declaration
            );
            result.push(
                tstl.createAssignmentStatement(
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

        const classField = tstl.createTableIndexExpression(tstl.cloneIdentifier(localClassName), fieldName);

        const fieldAssign = tstl.createAssignmentStatement(classField, value);

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
    let baseClassName: tstl.AssignmentLeftHandSideExpression | undefined;

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
        baseClassName = tstl.createTableIndexExpression(
            transformIdentifier(context, classDeclaration.name),
            tstl.createStringLiteral("____super"),
            expression
        );
    }

    return tstl.createTableIndexExpression(baseClassName, tstl.createStringLiteral("prototype"));
};

export const transformThisExpression: FunctionVisitor<ts.ThisExpression> = node => createSelfIdentifier(node);
