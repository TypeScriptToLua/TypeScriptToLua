import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext, Visitors } from "../context";
import { InvalidAmbientIdentifierName, UnsupportedKind } from "../utils/errors";
import { createExportedIdentifier, getSymbolExportScope } from "../utils/export";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import {
    createSafeName,
    hasUnsafeIdentifierName,
    hasUnsafeSymbolName,
    isValidLuaIdentifier,
    luaKeywords,
} from "../utils/safe-names";
import { getSymbolIdOfSymbol, trackSymbolReference } from "../utils/symbols";
import { isArrayType } from "../utils/typescript";
import { transformFunctionLikeDeclaration } from "./function";

// TODO: Move to object-literal.ts?
export function transformPropertyName(context: TransformationContext, node: ts.PropertyName): lua.Expression {
    if (ts.isComputedPropertyName(node)) {
        return context.transformExpression(node.expression);
    } else if (ts.isIdentifier(node)) {
        return lua.createStringLiteral(node.text);
    } else {
        return context.transformExpression(node);
    }
}

export function createShorthandIdentifier(
    context: TransformationContext,
    valueSymbol: ts.Symbol | undefined,
    propertyIdentifier: ts.Identifier
): lua.Expression {
    let name: string;
    if (valueSymbol !== undefined) {
        name = hasUnsafeSymbolName(context, valueSymbol, propertyIdentifier)
            ? createSafeName(valueSymbol.name)
            : valueSymbol.name;
    } else {
        const propertyName = propertyIdentifier.text;
        if (luaKeywords.has(propertyName) || !isValidLuaIdentifier(propertyName)) {
            // Catch ambient declarations of identifiers with bad names
            throw InvalidAmbientIdentifierName(propertyIdentifier);
        }

        name = hasUnsafeIdentifierName(context, propertyIdentifier) ? createSafeName(propertyName) : propertyName;
    }

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
        } else {
            // TODO: Accessors
            throw UnsupportedKind("object literal element", element.kind, expression);
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
    const values = expression.elements.map(element =>
        lua.createTableFieldExpression(
            ts.isOmittedExpression(element) ? lua.createNilLiteral(element) : context.transformExpression(element),
            undefined,
            element
        )
    );

    return lua.createTableExpression(values, expression);
};

export const literalVisitors: Visitors = {
    [ts.SyntaxKind.NullKeyword]: node => lua.createNilLiteral(node),
    [ts.SyntaxKind.TrueKeyword]: node => lua.createBooleanLiteral(true, node),
    [ts.SyntaxKind.FalseKeyword]: node => lua.createBooleanLiteral(false, node),
    [ts.SyntaxKind.NumericLiteral]: node => lua.createNumericLiteral(Number(node.text), node),
    [ts.SyntaxKind.StringLiteral]: node => lua.createStringLiteral(node.text, node),
    [ts.SyntaxKind.NoSubstitutionTemplateLiteral]: node => lua.createStringLiteral(node.text, node),
    [ts.SyntaxKind.ObjectLiteralExpression]: transformObjectLiteralExpression,
    [ts.SyntaxKind.ArrayLiteralExpression]: transformArrayLiteralExpression,
};
