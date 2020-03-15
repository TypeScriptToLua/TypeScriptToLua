import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { assertNever } from "../../utils";
import { FunctionVisitor, TransformationContext, Visitors } from "../context";
import { unsupportedAccessorInObjectLiteral } from "../utils/diagnostics";
import { createExportedIdentifier, getSymbolExportScope } from "../utils/export";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { createSafeName, hasUnsafeIdentifierName, hasUnsafeSymbolName } from "../utils/safe-names";
import { getSymbolIdOfSymbol, trackSymbolReference } from "../utils/symbols";
import { isArrayType } from "../utils/typescript";
import { transformFunctionLikeDeclaration } from "./function";
import { flattenSpreadExpressions } from "./call";

// TODO: Move to object-literal.ts?
export function transformPropertyName(context: TransformationContext, node: ts.PropertyName): lua.Expression {
    if (ts.isComputedPropertyName(node)) {
        return context.transformExpression(node.expression);
    } else if (ts.isIdentifier(node)) {
        return lua.createStringLiteral(node.text);
    } else if (ts.isPrivateIdentifier(node)) {
        throw new Error("PrivateIdentifier is not supported");
    } else {
        return context.transformExpression(node);
    }
}

export function createShorthandIdentifier(
    context: TransformationContext,
    valueSymbol: ts.Symbol | undefined,
    propertyIdentifier: ts.Identifier
): lua.Expression {
    const propertyName = propertyIdentifier.text;

    const isUnsafeName = valueSymbol
        ? hasUnsafeSymbolName(context, valueSymbol, propertyIdentifier)
        : hasUnsafeIdentifierName(context, propertyIdentifier, false);

    const name = isUnsafeName ? createSafeName(propertyName) : propertyName;

    let identifier = context.transformExpression(ts.createIdentifier(name));
    lua.setNodeOriginal(identifier, propertyIdentifier);
    if (valueSymbol !== undefined && lua.isIdentifier(identifier)) {
        identifier.symbolId = getSymbolIdOfSymbol(context, valueSymbol);

        const exportScope = getSymbolExportScope(context, valueSymbol);
        if (exportScope) {
            identifier = createExportedIdentifier(context, identifier, exportScope);
        }
    }

    return identifier;
}

const transformNumericLiteralExpression: FunctionVisitor<ts.NumericLiteral> = expression => {
    if (expression.text === "Infinity") {
        const math = lua.createIdentifier("math");
        const huge = lua.createStringLiteral("huge");
        return lua.createTableIndexExpression(math, huge, expression);
    }

    return lua.createNumericLiteral(Number(expression.text), expression);
};

const transformObjectLiteralExpression: FunctionVisitor<ts.ObjectLiteralExpression> = (expression, context) => {
    let properties: lua.TableFieldExpression[] = [];
    const tableExpressions: lua.Expression[] = [];

    for (const element of expression.properties) {
        const name = element.name ? transformPropertyName(context, element.name) : undefined;

        if (ts.isPropertyAssignment(element)) {
            const expression = context.transformExpression(element.initializer);
            properties.push(lua.createTableFieldExpression(expression, name, element));
        } else if (ts.isShorthandPropertyAssignment(element)) {
            const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
            if (valueSymbol) {
                trackSymbolReference(context, valueSymbol, element.name);
            }

            const identifier = createShorthandIdentifier(context, valueSymbol, element.name);
            properties.push(lua.createTableFieldExpression(identifier, name, element));
        } else if (ts.isMethodDeclaration(element)) {
            const expression = transformFunctionLikeDeclaration(element, context);
            properties.push(lua.createTableFieldExpression(expression, name, element));
        } else if (ts.isSpreadAssignment(element)) {
            // Create a table for preceding properties to preserve property order
            // { x: 0, ...{ y: 2 }, y: 1, z: 2 } --> __TS__ObjectAssign({x = 0}, {y = 2}, {y = 1, z = 2})
            if (properties.length > 0) {
                const tableExpression = lua.createTableExpression(properties, expression);
                tableExpressions.push(tableExpression);
                properties = [];
            }

            const type = context.checker.getTypeAtLocation(element.expression);
            let tableExpression: lua.Expression;
            if (isArrayType(context, type)) {
                tableExpression = transformLuaLibFunction(
                    context,
                    LuaLibFeature.ArrayToObject,
                    element.expression,
                    context.transformExpression(element.expression)
                );
            } else {
                tableExpression = context.transformExpression(element.expression);
            }

            tableExpressions.push(tableExpression);
        } else if (ts.isAccessor(element)) {
            context.diagnostics.push(unsupportedAccessorInObjectLiteral(element));
        } else {
            assertNever(element);
        }
    }

    if (tableExpressions.length === 0) {
        return lua.createTableExpression(properties, expression);
    } else {
        if (properties.length > 0) {
            const tableExpression = lua.createTableExpression(properties, expression);
            tableExpressions.push(tableExpression);
        }

        if (tableExpressions[0].kind !== lua.SyntaxKind.TableExpression) {
            tableExpressions.unshift(lua.createTableExpression(undefined, expression));
        }

        return transformLuaLibFunction(context, LuaLibFeature.ObjectAssign, expression, ...tableExpressions);
    }
};

const transformArrayLiteralExpression: FunctionVisitor<ts.ArrayLiteralExpression> = (expression, context) => {
    const filteredElements = expression.elements.map(e =>
        ts.isOmittedExpression(e) ? ts.createIdentifier("undefined") : e
    );
    const values = flattenSpreadExpressions(context, filteredElements).map(e => lua.createTableFieldExpression(e));

    return lua.createTableExpression(values, expression);
};

export const literalVisitors: Visitors = {
    [ts.SyntaxKind.NullKeyword]: node => lua.createNilLiteral(node),
    [ts.SyntaxKind.TrueKeyword]: node => lua.createBooleanLiteral(true, node),
    [ts.SyntaxKind.FalseKeyword]: node => lua.createBooleanLiteral(false, node),
    [ts.SyntaxKind.NumericLiteral]: transformNumericLiteralExpression,
    [ts.SyntaxKind.StringLiteral]: node => lua.createStringLiteral(node.text, node),
    [ts.SyntaxKind.NoSubstitutionTemplateLiteral]: node => lua.createStringLiteral(node.text, node),
    [ts.SyntaxKind.ObjectLiteralExpression]: transformObjectLiteralExpression,
    [ts.SyntaxKind.ArrayLiteralExpression]: transformArrayLiteralExpression,
};
