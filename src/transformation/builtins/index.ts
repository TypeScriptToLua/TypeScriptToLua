import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression } from "../transformers/call";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { getIdentifierSymbolId } from "../utils/symbols";
import { isArrayType, isFunctionType, isStandardLibraryType, isStringType } from "../utils/typescript";
import { transformArrayCall, transformArrayProperty } from "./array";
import { transformConsoleCall } from "./console";
import { transformFunctionCall } from "./function";
import { transformGlobalFunctionCall } from "./global";
import { transformMathCall, transformMathProperty } from "./math";
import { transformNumberConstructorCall } from "./number";
import { transformObjectCall, transformObjectConstructorCall } from "./object";
import { transformStringCall, transformStringConstructorCall, transformStringProperty } from "./string";
import { transformSymbolConstructorCall } from "./symbol";

export function transformBuiltinPropertyAccessExpression(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): tstl.Expression | undefined {
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
): tstl.Expression | undefined {
    const expressionType = context.checker.getTypeAtLocation(node.expression);
    if (ts.isIdentifier(node.expression) && isStandardLibraryType(context, expressionType, undefined)) {
        const result = transformGlobalFunctionCall(context, node);
        if (result) {
            return result;
        }
    }

    if (!ts.isPropertyAccessExpression(node.expression)) {
        return;
    }

    // TODO: block-level cast
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
        return transformStringCall(context, propertyCall);
    }

    if (isArrayType(context, ownerType)) {
        const result = transformArrayCall(context, propertyCall);
        if (result) {
            return result;
        }
    }

    if (isFunctionType(context, ownerType)) {
        return transformFunctionCall(context, propertyCall);
    }

    const objectResult = transformObjectCall(context, propertyCall);
    if (objectResult) {
        return objectResult;
    }
}

export function transformBuiltinIdentifierExpression(
    context: TransformationContext,
    node: ts.Identifier
): tstl.Expression | undefined {
    switch (node.text) {
        case "NaN":
            return tstl.createParenthesizedExpression(
                tstl.createBinaryExpression(
                    tstl.createNumericLiteral(0),
                    tstl.createNumericLiteral(0),
                    tstl.SyntaxKind.DivisionOperator,
                    node
                )
            );

        case "Infinity":
            const math = tstl.createIdentifier("math");
            const huge = tstl.createStringLiteral("huge");
            return tstl.createTableIndexExpression(math, huge, node);

        case "globalThis":
            return tstl.createIdentifier("_G", node, getIdentifierSymbolId(context, node), "globalThis");
    }
}
