import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { AllAccessorDeclarations, TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformLuaLibFunction, LuaLibFeature } from "../../../utils/lualib";
import { transformFunctionBody, transformParameters } from "../../function";
import { transformPropertyName } from "../../literal";
import { getExtendedType, isStaticNode } from "../utils";
import { createPrototypeName } from "./constructor";

function transformAccessor(context: TransformationContext, node: ts.AccessorDeclaration): lua.FunctionExpression {
    const [params, dot, restParam] = transformParameters(context, node.parameters, createSelfIdentifier());
    const body = node.body ? transformFunctionBody(context, node.parameters, node.body, restParam)[0] : [];
    return lua.createFunctionExpression(lua.createBlock(body), params, dot, lua.FunctionExpressionFlags.Declaration);
}

export function transformAccessorDeclarations(
    context: TransformationContext,
    { firstAccessor, getAccessor, setAccessor }: AllAccessorDeclarations,
    className: lua.Identifier
): lua.Statement | undefined {
    const propertyName = transformPropertyName(context, firstAccessor.name);
    const descriptor = lua.createTableExpression([]);

    if (getAccessor) {
        const getterFunction = transformAccessor(context, getAccessor);
        descriptor.fields.push(lua.createTableFieldExpression(getterFunction, lua.createStringLiteral("get")));
    }

    if (setAccessor) {
        const setterFunction = transformAccessor(context, setAccessor);
        descriptor.fields.push(lua.createTableFieldExpression(setterFunction, lua.createStringLiteral("set")));
    }

    const isStatic = isStaticNode(firstAccessor);
    const target = isStatic ? lua.cloneIdentifier(className) : createPrototypeName(className);
    const feature = isStatic ? LuaLibFeature.ObjectDefineProperty : LuaLibFeature.SetDescriptor;
    const parameters: lua.Expression[] = [target, propertyName, descriptor];
    if (!isStatic) parameters.push(lua.createBooleanLiteral(true));
    const call = transformLuaLibFunction(context, feature, undefined, ...parameters);
    return lua.createExpressionStatement(call);
}

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
