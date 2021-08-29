import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { assertNever } from "../../utils";
import { FunctionVisitor, TransformationContext, Visitors } from "../context";
import { invalidMultiFunctionUse, unsupportedAccessorInObjectLiteral } from "../utils/diagnostics";
import { createExportedIdentifier, getSymbolExportScope } from "../utils/export";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { createSafeName, hasUnsafeIdentifierName, hasUnsafeSymbolName } from "../utils/safe-names";
import { getSymbolIdOfSymbol, trackSymbolReference } from "../utils/symbols";
import { isArrayType } from "../utils/typescript";
import { transformFunctionLikeDeclaration } from "./function";
import { flattenSpreadExpressions } from "./call";
import { findMultiAssignmentViolations } from "./language-extensions/multi";
import { formatJSXStringValueLiteral } from "./jsx/jsx";

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

    let identifier = context.transformExpression(ts.factory.createIdentifier(name));
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

const transformObjectLiteralExpressionOrJsxAttributes: FunctionVisitor<ts.ObjectLiteralExpression | ts.JsxAttributes> =
    (expression, context) => {
        const violations = findMultiAssignmentViolations(context, expression);
        if (violations.length > 0) {
            context.diagnostics.push(...violations.map(e => invalidMultiFunctionUse(e)));
            return lua.createNilLiteral(expression);
        }

        const transformedProperties: lua.Expression[] = [];
        let lastPrecedingStatementsIndex = -1;

        for (let i = 0; i < expression.properties.length; ++i) {
            const element = expression.properties[i];
            const name = element.name ? transformPropertyName(context, element.name) : undefined;

            context.pushPrecedingStatements();

            if (ts.isPropertyAssignment(element)) {
                const expression = context.transformExpression(element.initializer);
                transformedProperties.push(lua.createTableFieldExpression(expression, name, element));
            } else if (ts.isJsxAttribute(element)) {
                const initializer = element.initializer;
                let expression: lua.Expression;
                if (initializer === undefined) {
                    expression = lua.createBooleanLiteral(true);
                } else if (ts.isStringLiteral(initializer)) {
                    const text = formatJSXStringValueLiteral(initializer.text);
                    expression = lua.createStringLiteral(text, initializer);
                } else if (ts.isJsxExpression(initializer)) {
                    expression = initializer.expression
                        ? context.transformExpression(initializer.expression)
                        : lua.createBooleanLiteral(true);
                } else {
                    assertNever(initializer);
                }
                transformedProperties.push(lua.createTableFieldExpression(expression, name, element));
            } else if (ts.isShorthandPropertyAssignment(element)) {
                const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
                if (valueSymbol) {
                    trackSymbolReference(context, valueSymbol, element.name);
                }

                const identifier = createShorthandIdentifier(context, valueSymbol, element.name);
                transformedProperties.push(lua.createTableFieldExpression(identifier, name, element));
            } else if (ts.isMethodDeclaration(element)) {
                const expression = transformFunctionLikeDeclaration(element, context);
                transformedProperties.push(lua.createTableFieldExpression(expression, name, element));
            } else if (ts.isSpreadAssignment(element) || ts.isJsxSpreadAttribute(element)) {
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

                transformedProperties.push(tableExpression);
            } else if (ts.isAccessor(element)) {
                context.diagnostics.push(unsupportedAccessorInObjectLiteral(element));
            } else {
                assertNever(element);
            }

            const precedingStatements = context.popPrecedingStatements();
            if (precedingStatements.length === 0) {
                continue;
            }

            // If preceding statements were generated, walk back and cache previous values in temps
            for (let j = lastPrecedingStatementsIndex + 1; j < i; ++j) {
                const previousProperty = transformedProperties[j];
                if (lua.isTableFieldExpression(previousProperty)) {
                    if (!lua.isLiteral(previousProperty.value)) {
                        const tempVar = lua.createIdentifier(
                            context.createTempNameFromExpression(previousProperty.value)
                        );
                        context.addPrecedingStatements([
                            lua.createVariableDeclarationStatement(tempVar, previousProperty.value),
                        ]);
                        previousProperty.value = lua.cloneIdentifier(tempVar);
                    }
                } else {
                    const tempVar = lua.createIdentifier(context.createTempNameFromExpression(previousProperty));
                    context.addPrecedingStatements([lua.createVariableDeclarationStatement(tempVar, previousProperty)]);
                    transformedProperties[j] = lua.cloneIdentifier(tempVar);
                }
            }
            lastPrecedingStatementsIndex = i;

            // Bubble up preceding statements
            context.addPrecedingStatements(precedingStatements);
        }

        // Sort into field expressions and tables to pass into __TS__ObjectAssign
        let properties: lua.TableFieldExpression[] = [];
        const tableExpressions: lua.Expression[] = [];
        for (const property of transformedProperties) {
            if (lua.isTableFieldExpression(property)) {
                properties.push(property);
            } else {
                if (properties.length > 0) {
                    tableExpressions.push(lua.createTableExpression(properties));
                }
                tableExpressions.push(property);
                properties = [];
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
const transformObjectLiteralExpression: FunctionVisitor<ts.ObjectLiteralExpression> =
    transformObjectLiteralExpressionOrJsxAttributes;
export const transformJsxAttributes: FunctionVisitor<ts.JsxAttributes> =
    transformObjectLiteralExpressionOrJsxAttributes;

const transformArrayLiteralExpression: FunctionVisitor<ts.ArrayLiteralExpression> = (expression, context) => {
    const filteredElements = expression.elements.map(e =>
        ts.isOmittedExpression(e) ? ts.factory.createIdentifier("undefined") : e
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
