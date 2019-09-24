import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
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
export function transformPropertyName(context: TransformationContext, node: ts.PropertyName): tstl.Expression {
    if (ts.isComputedPropertyName(node)) {
        return context.transformExpression(node.expression);
    } else if (ts.isIdentifier(node)) {
        return tstl.createStringLiteral(node.text);
    } else {
        return context.transformExpression(node);
    }
}

export function createShorthandIdentifier(
    context: TransformationContext,
    valueSymbol: ts.Symbol | undefined,
    propertyIdentifier: ts.Identifier
): tstl.Expression {
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
    tstl.setNodeOriginal(identifier, propertyIdentifier);
    if (valueSymbol !== undefined && tstl.isIdentifier(identifier)) {
        identifier.symbolId = getSymbolIdOfSymbol(context, valueSymbol);

        const exportScope = getSymbolExportScope(context, valueSymbol);
        if (exportScope) {
            identifier = createExportedIdentifier(context, identifier, exportScope);
        }
    }

    return identifier;
}

const transformObjectLiteralExpression: FunctionVisitor<ts.ObjectLiteralExpression> = (expression, context) => {
    let properties: tstl.TableFieldExpression[] = [];
    const tableExpressions: tstl.Expression[] = [];

    for (const element of expression.properties) {
        const name = element.name ? transformPropertyName(context, element.name) : undefined;

        if (ts.isPropertyAssignment(element)) {
            const expression = context.transformExpression(element.initializer);
            properties.push(tstl.createTableFieldExpression(expression, name, element));
        } else if (ts.isShorthandPropertyAssignment(element)) {
            const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
            if (valueSymbol) {
                trackSymbolReference(context, valueSymbol, element.name);
            }

            const identifier = createShorthandIdentifier(context, valueSymbol, element.name);
            properties.push(tstl.createTableFieldExpression(identifier, name, element));
        } else if (ts.isMethodDeclaration(element)) {
            const expression = transformFunctionLikeDeclaration(element, context);
            properties.push(tstl.createTableFieldExpression(expression, name, element));
        } else if (ts.isSpreadAssignment(element)) {
            // Create a table for preceding properties to preserve property order
            // { x: 0, ...{ y: 2 }, y: 1, z: 2 } --> __TS__ObjectAssign({x = 0}, {y = 2}, {y = 1, z = 2})
            if (properties.length > 0) {
                const tableExpression = tstl.createTableExpression(properties, expression);
                tableExpressions.push(tableExpression);
                properties = [];
            }

            const type = context.checker.getTypeAtLocation(element.expression);
            let tableExpression: tstl.Expression;
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
        return tstl.createTableExpression(properties, expression);
    } else {
        if (properties.length > 0) {
            const tableExpression = tstl.createTableExpression(properties, expression);
            tableExpressions.push(tableExpression);
        }

        if (tableExpressions[0].kind !== tstl.SyntaxKind.TableExpression) {
            tableExpressions.unshift(tstl.createTableExpression(undefined, expression));
        }

        return transformLuaLibFunction(context, LuaLibFeature.ObjectAssign, expression, ...tableExpressions);
    }
};

const transformArrayLiteralExpression: FunctionVisitor<ts.ArrayLiteralExpression> = (expression, context) => {
    const values = expression.elements.map(element =>
        tstl.createTableFieldExpression(context.transformExpression(element), undefined, element)
    );

    return tstl.createTableExpression(values, expression);
};

export const literalPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.NullKeyword]: node => tstl.createNilLiteral(node),
        [ts.SyntaxKind.TrueKeyword]: node => tstl.createBooleanLiteral(true, node),
        [ts.SyntaxKind.FalseKeyword]: node => tstl.createBooleanLiteral(false, node),
        [ts.SyntaxKind.NumericLiteral]: node => tstl.createNumericLiteral(Number(node.text), node),
        [ts.SyntaxKind.StringLiteral]: node => tstl.createStringLiteral(node.text, node),
        [ts.SyntaxKind.NoSubstitutionTemplateLiteral]: node => tstl.createStringLiteral(node.text, node),
        [ts.SyntaxKind.ObjectLiteralExpression]: transformObjectLiteralExpression,
        [ts.SyntaxKind.ArrayLiteralExpression]: transformArrayLiteralExpression,
    },
};
