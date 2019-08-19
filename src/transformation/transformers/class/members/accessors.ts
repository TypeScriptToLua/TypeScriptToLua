import * as ts from "typescript";
import * as tstl from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformFunctionBody, transformParameters } from "../../function";
import { transformIdentifier } from "../../identifier";
import { findInClassOrAncestor, isStaticNode } from "../utils";

export function hasSetAccessorInClassOrAncestor(
    context: TransformationContext,
    classDeclaration: ts.ClassLikeDeclarationBase,
    isStatic: boolean
): boolean {
    return (
        findInClassOrAncestor(context, classDeclaration, c =>
            c.members.some(m => ts.isSetAccessor(m) && isStaticNode(m) === isStatic)
        ) !== undefined
    );
}

export function hasGetAccessorInClassOrAncestor(
    context: TransformationContext,
    classDeclaration: ts.ClassLikeDeclarationBase,
    isStatic: boolean
): boolean {
    return (
        findInClassOrAncestor(context, classDeclaration, c =>
            c.members.some(m => ts.isGetAccessor(m) && isStaticNode(m) === isStatic)
        ) !== undefined
    );
}

function getPropertyName(propertyName: ts.PropertyName): string | number | undefined {
    if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName) || ts.isNumericLiteral(propertyName)) {
        return propertyName.text;
    } else {
        return undefined; // TODO: how to handle computed property names?
    }
}

function isSamePropertyName(a: ts.PropertyName, b: ts.PropertyName): boolean {
    const aName = getPropertyName(a);
    const bName = getPropertyName(b);
    return aName !== undefined && aName === bName;
}

export function isGetAccessorOverride(
    context: TransformationContext,
    element: ts.ClassElement,
    classDeclaration: ts.ClassLikeDeclarationBase
): element is ts.GetAccessorDeclaration {
    if (!ts.isGetAccessor(element) || isStaticNode(element)) {
        return false;
    }

    const hasInitializedField = (e: ts.ClassElement) =>
        ts.isPropertyDeclaration(e) && e.initializer !== undefined && isSamePropertyName(e.name, element.name);

    return findInClassOrAncestor(context, classDeclaration, c => c.members.some(hasInitializedField)) !== undefined;
}

export function transformAccessorDeclaration(
    context: TransformationContext,
    node: ts.AccessorDeclaration,
    className: tstl.Identifier
): tstl.Statement | undefined {
    if (node.body === undefined) {
        return undefined;
    }

    const name = transformIdentifier(context, node.name as ts.Identifier);

    const [params, dot, restParam] = transformParameters(context, node.parameters, createSelfIdentifier());
    const [body] = transformFunctionBody(context, node.parameters, node.body, restParam);
    const accessorFunction = tstl.createFunctionExpression(
        tstl.createBlock(body),
        params,
        dot,
        restParam,
        tstl.FunctionExpressionFlags.Declaration
    );

    const methodTable = isStaticNode(node)
        ? tstl.cloneIdentifier(className)
        : tstl.createTableIndexExpression(tstl.cloneIdentifier(className), tstl.createStringLiteral("prototype"));

    const classAccessorsName = ts.isGetAccessorDeclaration(node) ? "____getters" : "____setters";
    const classAccessors = tstl.createTableIndexExpression(methodTable, tstl.createStringLiteral(classAccessorsName));
    const accessorPath = tstl.createTableIndexExpression(classAccessors, tstl.createStringLiteral(name.text));
    return tstl.createAssignmentStatement(accessorPath, accessorFunction, node);
}
