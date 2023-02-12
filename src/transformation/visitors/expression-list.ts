import assert = require("assert");
import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext, tempSymbolId } from "../context";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { isConstIdentifier } from "../utils/typescript";
import { isOptionalContinuation } from "./optional-chaining";

export function shouldMoveToTemp(context: TransformationContext, expression: lua.Expression, tsOriginal?: ts.Node) {
    return (
        !lua.isLiteral(expression) &&
        !(lua.isIdentifier(expression) && expression.symbolId === tempSymbolId) && // Treat generated temps as consts
        !(
            tsOriginal &&
            (isConstIdentifier(context, tsOriginal) ||
                isOptionalContinuation(tsOriginal) ||
                tsOriginal.kind === ts.SyntaxKind.ThisKeyword)
        )
    );
}

// Cache an expression in a preceding statement and return the temp identifier
export function moveToPrecedingTemp(
    context: TransformationContext,
    expression: lua.Expression,
    tsOriginal?: ts.Node
): lua.Expression {
    if (!shouldMoveToTemp(context, expression, tsOriginal)) {
        return expression;
    }
    const tempIdentifier = context.createTempNameForLuaExpression(expression);
    const tempDeclaration = lua.createVariableDeclarationStatement(tempIdentifier, expression, tsOriginal);
    context.addPrecedingStatements(tempDeclaration);
    return lua.cloneIdentifier(tempIdentifier, tsOriginal);
}

function transformExpressions(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): {
    transformedExpressions: lua.Expression[];
    precedingStatements: lua.Statement[][];
    lastPrecedingStatementsIndex: number;
} {
    const precedingStatements: lua.Statement[][] = [];
    const transformedExpressions: lua.Expression[] = [];
    let lastPrecedingStatementsIndex = -1;
    for (let i = 0; i < expressions.length; ++i) {
        const { precedingStatements: expressionPrecedingStatements, result: expression } =
            transformInPrecedingStatementScope(context, () => context.transformExpression(expressions[i]));
        transformedExpressions.push(expression);
        if (expressionPrecedingStatements.length > 0) {
            lastPrecedingStatementsIndex = i;
        }
        precedingStatements.push(expressionPrecedingStatements);
    }
    return { transformedExpressions, precedingStatements, lastPrecedingStatementsIndex };
}

function transformExpressionsUsingTemps(
    context: TransformationContext,
    expressions: readonly ts.Expression[],
    transformedExpressions: lua.Expression[],
    precedingStatements: lua.Statement[][],
    lastPrecedingStatementsIndex: number
) {
    for (let i = 0; i < transformedExpressions.length; ++i) {
        context.addPrecedingStatements(precedingStatements[i]);
        if (i < lastPrecedingStatementsIndex) {
            transformedExpressions[i] = moveToPrecedingTemp(context, transformedExpressions[i], expressions[i]);
        }
    }
    return transformedExpressions;
}

function pushToSparseArray(
    context: TransformationContext,
    arrayIdentifier: lua.Identifier | undefined,
    expressions: lua.Expression[]
) {
    if (!arrayIdentifier) {
        arrayIdentifier = lua.createIdentifier(context.createTempName("array"));
        const libCall = transformLuaLibFunction(context, LuaLibFeature.SparseArrayNew, undefined, ...expressions);
        const declaration = lua.createVariableDeclarationStatement(arrayIdentifier, libCall);
        context.addPrecedingStatements(declaration);
    } else {
        const libCall = transformLuaLibFunction(
            context,
            LuaLibFeature.SparseArrayPush,
            undefined,
            arrayIdentifier,
            ...expressions
        );
        context.addPrecedingStatements(lua.createExpressionStatement(libCall));
    }
    return arrayIdentifier;
}

function transformExpressionsUsingSparseArray(
    context: TransformationContext,
    expressions: readonly ts.Expression[],
    transformedExpressions: lua.Expression[],
    precedingStatements: lua.Statement[][]
) {
    let arrayIdentifier: lua.Identifier | undefined;

    let expressionBatch: lua.Expression[] = [];
    for (let i = 0; i < expressions.length; ++i) {
        // Expressions with preceding statements should always be at the start of a batch
        if (precedingStatements[i].length > 0 && expressionBatch.length > 0) {
            arrayIdentifier = pushToSparseArray(context, arrayIdentifier, expressionBatch);
            expressionBatch = [];
        }

        context.addPrecedingStatements(precedingStatements[i]);
        expressionBatch.push(transformedExpressions[i]);

        // Spread expressions should always be at the end of a batch
        if (ts.isSpreadElement(expressions[i])) {
            arrayIdentifier = pushToSparseArray(context, arrayIdentifier, expressionBatch);
            expressionBatch = [];
        }
    }

    if (expressionBatch.length > 0) {
        arrayIdentifier = pushToSparseArray(context, arrayIdentifier, expressionBatch);
    }

    assert(arrayIdentifier);
    return [transformLuaLibFunction(context, LuaLibFeature.SparseArraySpread, undefined, arrayIdentifier)];
}

function countNeededTemps(
    context: TransformationContext,
    expressions: readonly ts.Expression[],
    transformedExpressions: lua.Expression[],
    lastPrecedingStatementsIndex: number
) {
    if (lastPrecedingStatementsIndex < 0) {
        return 0;
    }
    return transformedExpressions
        .slice(0, lastPrecedingStatementsIndex)
        .filter((e, i) => shouldMoveToTemp(context, e, expressions[i])).length;
}

// Transforms a list of expressions while flattening spreads and maintaining execution order
export function transformExpressionList(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): lua.Expression[] {
    const { transformedExpressions, precedingStatements, lastPrecedingStatementsIndex } = transformExpressions(
        context,
        expressions
    );

    // If more than this number of temps are required to preserve execution order, we'll fall back to using the
    // sparse array lib functions instead to prevent excessive locals.
    const maxTemps = 2;

    // Use sparse array lib if there are spreads before the last expression
    // or if too many temps are needed to preserve order
    const lastSpread = expressions.findIndex(e => ts.isSpreadElement(e));
    if (
        (lastSpread >= 0 && lastSpread < expressions.length - 1) ||
        countNeededTemps(context, expressions, transformedExpressions, lastPrecedingStatementsIndex) > maxTemps
    ) {
        return transformExpressionsUsingSparseArray(context, expressions, transformedExpressions, precedingStatements);
    } else {
        return transformExpressionsUsingTemps(
            context,
            expressions,
            transformedExpressions,
            precedingStatements,
            lastPrecedingStatementsIndex
        );
    }
}

// Transforms a series of expressions while maintaining execution order
export function transformOrderedExpressions(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): lua.Expression[] {
    const { transformedExpressions, precedingStatements, lastPrecedingStatementsIndex } = transformExpressions(
        context,
        expressions
    );
    return transformExpressionsUsingTemps(
        context,
        expressions,
        transformedExpressions,
        precedingStatements,
        lastPrecedingStatementsIndex
    );
}
