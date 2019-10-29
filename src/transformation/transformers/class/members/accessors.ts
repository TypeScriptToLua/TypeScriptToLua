import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformFunctionBody, transformParameters } from "../../function";
import { transformIdentifier } from "../../identifier";
import { getExtendedType, isStaticNode } from "../utils";

// TODO: Inline to `hasMemberInClassOrAncestor`?
function* classWithAncestors(
    context: TransformationContext,
    classDeclaration: ts.ClassLikeDeclarationBase
): Generator<ts.ClassLikeDeclarationBase> {
    yield classDeclaration;

    const extendsType = getExtendedType(context, classDeclaration);
    if (!extendsType) {
        return false;
    }

    const symbol = extendsType.getSymbol();
    if (symbol === undefined) {
        return false;
    }

    const symbolDeclarations = symbol.getDeclarations();
    if (symbolDeclarations === undefined) {
        return false;
    }

    const declaration = symbolDeclarations.find(ts.isClassLike);
    if (!declaration) {
        return false;
    }

    yield* classWithAncestors(context, declaration);
}

export const hasMemberInClassOrAncestor = (
    context: TransformationContext,
    classDeclaration: ts.ClassLikeDeclarationBase,
    callback: (m: ts.ClassElement) => boolean
) => [...classWithAncestors(context, classDeclaration)].some(c => c.members.some(callback));

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

    return hasMemberInClassOrAncestor(
        context,
        classDeclaration,
        m => ts.isPropertyDeclaration(m) && m.initializer !== undefined && isSamePropertyName(m.name, element.name)
    );
}

export function transformAccessorDeclaration(
    context: TransformationContext,
    node: ts.AccessorDeclaration,
    className: lua.Identifier
): lua.Statement | undefined {
    if (node.body === undefined) {
        return undefined;
    }

    const name = transformIdentifier(context, node.name as ts.Identifier);

    const [params, dot, restParam] = transformParameters(context, node.parameters, createSelfIdentifier());
    const [body] = transformFunctionBody(context, node.parameters, node.body, restParam);
    const accessorFunction = lua.createFunctionExpression(
        lua.createBlock(body),
        params,
        dot,
        restParam,
        lua.FunctionExpressionFlags.Declaration
    );

    const methodTable = isStaticNode(node)
        ? lua.cloneIdentifier(className)
        : lua.createTableIndexExpression(lua.cloneIdentifier(className), lua.createStringLiteral("prototype"));

    const classAccessorsName = ts.isGetAccessorDeclaration(node) ? "____getters" : "____setters";
    const classAccessors = lua.createTableIndexExpression(methodTable, lua.createStringLiteral(classAccessorsName));
    const accessorPath = lua.createTableIndexExpression(classAccessors, lua.createStringLiteral(name.text));
    return lua.createAssignmentStatement(accessorPath, accessorFunction, node);
}
