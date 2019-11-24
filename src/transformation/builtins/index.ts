import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression } from "../transformers/call";
import { checkForLuaLibType } from "../transformers/class/new";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { getIdentifierSymbolId } from "../utils/symbols";
import { isArrayType, isFunctionType, isStandardLibraryType, isStringType } from "../utils/typescript";
import { transformArrayProperty, transformArrayPrototypeCall } from "./array";
import { transformConsoleCall } from "./console";
import { transformFunctionPrototypeCall } from "./function";
import { transformGlobalCall } from "./global";
import { transformMathCall, transformMathProperty } from "./math";
import { transformNumberConstructorCall } from "./number";
import { transformObjectConstructorCall, transformObjectPrototypeCall } from "./object";
import { transformStringConstructorCall, transformStringProperty, transformStringPrototypeCall } from "./string";
import { transformSymbolConstructorCall } from "./symbol";

export function transformBuiltinPropertyAccessExpression(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const type = context.checker.getTypeAtLocation(node.expression);
    if (isStringType(context, type)) {
        return transformStringProperty(context, node);
    } else if (isArrayType(context, type)) {
        const arrayPropertyAccess = transformArrayProperty(context, node);
        if (arrayPropertyAccess) {
            return arrayPropertyAccess;
        }
    }

    if (ts.isIdentifier(node.expression)) {
        const ownerType = context.checker.getTypeAtLocation(node.expression);

        if (isStandardLibraryType(context, ownerType, "Math")) {
            return transformMathProperty(node);
        } else if (isStandardLibraryType(context, ownerType, "Symbol")) {
            // Pull in Symbol lib
            importLuaLibFeature(context, LuaLibFeature.Symbol);
        }
    }
}

export function transformBuiltinCallExpression(
    context: TransformationContext,
    node: ts.CallExpression
): lua.Expression | undefined {
    const expressionType = context.checker.getTypeAtLocation(node.expression);
    if (ts.isIdentifier(node.expression) && isStandardLibraryType(context, expressionType, undefined)) {
        // TODO:
        checkForLuaLibType(context, expressionType);
        const result = transformGlobalCall(context, node);
        if (result) {
            return result;
        }
    }

    if (!ts.isPropertyAccessExpression(node.expression)) {
        return;
    }

    // TODO(TypeScript 3.7): assume
    const propertyCall = node as PropertyCallExpression;

    // If the function being called is of type owner.func, get the type of owner
    const ownerType = context.checker.getTypeAtLocation(node.expression.expression);

    if (isStandardLibraryType(context, ownerType, undefined)) {
        const symbol = ownerType.getSymbol();
        const symbolName = symbol && symbol.name;
        switch (symbolName) {
            case "Console":
                return transformConsoleCall(context, propertyCall);
            case "Math":
                return transformMathCall(context, propertyCall);
            case "StringConstructor":
                return transformStringConstructorCall(context, propertyCall);
            case "ObjectConstructor":
                return transformObjectConstructorCall(context, propertyCall);
            case "SymbolConstructor":
                return transformSymbolConstructorCall(context, propertyCall);
            case "NumberConstructor":
                return transformNumberConstructorCall(context, propertyCall);
        }
    }

    if (isStringType(context, ownerType)) {
        return transformStringPrototypeCall(context, propertyCall);
    }

    if (isArrayType(context, ownerType)) {
        const result = transformArrayPrototypeCall(context, propertyCall);
        if (result) {
            return result;
        }
    }

    if (isFunctionType(context, ownerType)) {
        return transformFunctionPrototypeCall(context, propertyCall);
    }

    const objectResult = transformObjectPrototypeCall(context, propertyCall);
    if (objectResult) {
        return objectResult;
    }
}

export function transformBuiltinIdentifierExpression(
    context: TransformationContext,
    node: ts.Identifier
): lua.Expression | undefined {
    switch (node.text) {
        case "NaN":
            return lua.createParenthesizedExpression(
                lua.createBinaryExpression(
                    lua.createNumericLiteral(0),
                    lua.createNumericLiteral(0),
                    lua.SyntaxKind.DivisionOperator,
                    node
                )
            );

        case "Infinity":
            const math = lua.createIdentifier("math");
            const huge = lua.createStringLiteral("huge");
            return lua.createTableIndexExpression(math, huge, node);

        case "globalThis":
            return lua.createIdentifier("_G", node, getIdentifierSymbolId(context, node), "globalThis");
    }
}
