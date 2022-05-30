import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { createNaN } from "../utils/lua-ast";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { getIdentifierSymbolId } from "../utils/symbols";
import {
    hasStandardLibrarySignature,
    isArrayType,
    isFunctionType,
    isNullableType,
    isNumberType,
    isStandardLibraryType,
    isStringType,
} from "../utils/typescript";
import { getCalledExpression } from "../visitors/call";
import { transformArrayConstructorCall, transformArrayProperty, transformArrayPrototypeCall } from "./array";
import { transformConsoleCall } from "./console";
import { transformFunctionPrototypeCall, transformFunctionProperty } from "./function";
import { transformGlobalCall } from "./global";
import { transformMathCall, transformMathProperty } from "./math";
import { transformNumberConstructorCall, transformNumberPrototypeCall } from "./number";
import { transformObjectConstructorCall, transformObjectPrototypeCall } from "./object";
import { transformPromiseConstructorCall } from "./promise";
import { transformStringConstructorCall, transformStringProperty, transformStringPrototypeCall } from "./string";
import { transformSymbolConstructorCall } from "./symbol";
import { unsupportedBuiltinOptionalCall } from "../utils/diagnostics";

export function transformBuiltinPropertyAccessExpression(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const ownerType = context.checker.getTypeAtLocation(node.expression);

    if (ts.isIdentifier(node.expression) && isStandardLibraryType(context, ownerType, undefined)) {
        switch (node.expression.text) {
            case "Math":
                return transformMathProperty(context, node);
            case "Symbol":
                importLuaLibFeature(context, LuaLibFeature.Symbol);
        }
    }

    if (isStringType(context, ownerType)) {
        return transformStringProperty(context, node);
    }

    if (isArrayType(context, ownerType)) {
        return transformArrayProperty(context, node);
    }

    if (isFunctionType(ownerType)) {
        return transformFunctionProperty(context, node);
    }
}

export function transformBuiltinCallExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    isOptionalCall: boolean
): lua.Expression | undefined {
    const unsupportedOptionalCall = () => {
        context.diagnostics.push(unsupportedBuiltinOptionalCall(node));
        return lua.createNilLiteral();
    };
    const expressionType = context.checker.getTypeAtLocation(node.expression);
    if (ts.isIdentifier(node.expression) && isStandardLibraryType(context, expressionType, undefined)) {
        checkForLuaLibType(context, expressionType);
        const result = transformGlobalCall(context, node);
        if (result) {
            if (isOptionalCall) return unsupportedOptionalCall();
            return result;
        }
    }

    const calledMethod = ts.getOriginalNode(getCalledExpression(node));
    if (!ts.isPropertyAccessExpression(calledMethod)) {
        return;
    }

    const isOptionalAccess = calledMethod.questionDotToken;
    // If the function being called is of type owner.func, get the type of owner
    const ownerType = context.checker.getTypeAtLocation(calledMethod.expression);

    if (isStandardLibraryType(context, ownerType, undefined)) {
        const symbol = ownerType.getSymbol();
        switch (symbol?.name) {
            case "ArrayConstructor":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformArrayConstructorCall(context, node, calledMethod);
            case "Console":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformConsoleCall(context, node, calledMethod);
            case "Math":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformMathCall(context, node, calledMethod);
            case "StringConstructor":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformStringConstructorCall(context, node, calledMethod);
            case "ObjectConstructor":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformObjectConstructorCall(context, node, calledMethod);
            case "SymbolConstructor":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformSymbolConstructorCall(context, node, calledMethod);
            case "NumberConstructor":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformNumberConstructorCall(context, node, calledMethod);
            case "PromiseConstructor":
                if (isOptionalCall || isOptionalAccess) return unsupportedOptionalCall();
                return transformPromiseConstructorCall(context, node, calledMethod);
        }
    }

    const isStringFunction =
        isStringType(context, ownerType) ||
        (calledMethod.questionDotToken && isNullableType(context, ownerType, isStringType));
    if (isStringFunction && hasStandardLibrarySignature(context, node)) {
        if (isOptionalCall) return unsupportedOptionalCall();
        return transformStringPrototypeCall(context, node, calledMethod);
    }

    const isNumberFunction =
        isNumberType(context, ownerType) ||
        (calledMethod.questionDotToken && isNullableType(context, ownerType, isNumberType));
    if (isNumberFunction && hasStandardLibrarySignature(context, node)) {
        if (isOptionalCall) return unsupportedOptionalCall();
        return transformNumberPrototypeCall(context, node, calledMethod);
    }

    const isArrayFunction =
        isArrayType(context, ownerType) ||
        (calledMethod.questionDotToken && isNullableType(context, ownerType, isArrayType));
    if (isArrayFunction && hasStandardLibrarySignature(context, node)) {
        if (isOptionalCall) return unsupportedOptionalCall();
        return transformArrayPrototypeCall(context, node, calledMethod);
    }

    const isFunctionFunction =
        isFunctionType(ownerType) ||
        (calledMethod.questionDotToken && isNullableType(context, ownerType, (_, t) => isFunctionType(t)));
    if (isFunctionFunction && hasStandardLibrarySignature(context, node)) {
        if (isOptionalCall) return unsupportedOptionalCall();
        return transformFunctionPrototypeCall(context, node, calledMethod);
    }

    const objectResult = transformObjectPrototypeCall(context, node, calledMethod);
    if (objectResult) {
        if (isOptionalCall) return unsupportedOptionalCall();
        return objectResult;
    }
}

export function transformBuiltinIdentifierExpression(
    context: TransformationContext,
    node: ts.Identifier
): lua.Expression | undefined {
    switch (node.text) {
        case "NaN":
            return createNaN(node);

        case "Infinity":
            const math = lua.createIdentifier("math");
            const huge = lua.createStringLiteral("huge");
            return lua.createTableIndexExpression(math, huge, node);

        case "globalThis":
            return lua.createIdentifier("_G", node, getIdentifierSymbolId(context, node), "globalThis");
    }
}

const builtinErrorTypeNames = new Set([
    "Error",
    "ErrorConstructor",
    "RangeError",
    "RangeErrorConstructor",
    "ReferenceError",
    "ReferenceErrorConstructor",
    "SyntaxError",
    "SyntaxErrorConstructor",
    "TypeError",
    "TypeErrorConstructor",
    "URIError",
    "URIErrorConstructor",
]);

export function checkForLuaLibType(context: TransformationContext, type: ts.Type): void {
    if (!type.symbol) return;

    const name = context.checker.getFullyQualifiedName(type.symbol);
    switch (name) {
        case "Map":
        case "MapConstructor":
            importLuaLibFeature(context, LuaLibFeature.Map);
            return;
        case "Set":
        case "SetConstructor":
            importLuaLibFeature(context, LuaLibFeature.Set);
            return;
        case "WeakMap":
        case "WeakMapConstructor":
            importLuaLibFeature(context, LuaLibFeature.WeakMap);
            return;
        case "WeakSet":
        case "WeakSetConstructor":
            importLuaLibFeature(context, LuaLibFeature.WeakSet);
            return;
    }

    if (builtinErrorTypeNames.has(name)) {
        importLuaLibFeature(context, LuaLibFeature.Error);
    }
}
