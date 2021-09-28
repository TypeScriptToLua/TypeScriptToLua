import assert = require("assert");
import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isConstIdentifier } from "../utils/typescript";

// Cache an expression in a preceding statement and return the temp identifier
export function moveToPrecedingTemp(
    context: TransformationContext,
    expression: lua.Expression,
    tsOriginal?: ts.Node
): lua.Expression {
    if (lua.isLiteral(expression) || (tsOriginal && isConstIdentifier(context, tsOriginal))) {
        return expression;
    }
    const tempIdentifier = context.createTempForLuaExpression(expression);
    const tempDeclaration = lua.createVariableDeclarationStatement(tempIdentifier, expression);
    lua.setNodePosition(tempDeclaration, lua.getOriginalPos(expression));
    context.addPrecedingStatements(tempDeclaration);
    const tempClone = lua.cloneIdentifier(tempIdentifier);
    lua.setNodePosition(tempClone, lua.getOriginalPos(tempIdentifier));
    return tempClone;
}

function shouldMoveToTemp(
    context: TransformationContext,
    expression: ts.Expression,
    transformedExpression: lua.Expression
) {
    return !lua.isLiteral(transformedExpression) && !isConstIdentifier(context, expression);
}

function transformExpressions(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): [lua.Expression[], lua.Statement[][], number] {
    const precedingStatements: lua.Statement[][] = [];
    const transformExpressions: lua.Expression[] = [];
    let lastPrecedingStatementsIndex = -1;
    for (let i = 0; i < expressions.length; ++i) {
        context.pushPrecedingStatements();
        transformExpressions.push(context.transformExpression(expressions[i]));
        const expressionPrecedingStatements = context.popPrecedingStatements();
        if (expressionPrecedingStatements.length > 0) {
            lastPrecedingStatementsIndex = i;
        }
        precedingStatements.push(expressionPrecedingStatements);
    }
    return [transformExpressions, precedingStatements, lastPrecedingStatementsIndex];
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

        const transformedExpression = transformedExpressions[i];
        const expression = expressions[i];
        if (i < lastPrecedingStatementsIndex && shouldMoveToTemp(context, expression, transformedExpression)) {
            transformedExpressions[i] = moveToPrecedingTemp(context, transformedExpression, expression);
        }
    }

    return transformedExpressions;
}

function pushToList(
    context: TransformationContext,
    listIdentifier: lua.Identifier | undefined,
    expressions: lua.Expression[]
) {
    if (!listIdentifier) {
        listIdentifier = lua.createIdentifier(context.createTempName("list"));
        const libCall = transformLuaLibFunction(context, LuaLibFeature.SparseArrayNew, undefined, ...expressions);
        const declaration = lua.createVariableDeclarationStatement(listIdentifier, libCall);
        context.addPrecedingStatements(declaration);
    } else {
        const libCall = transformLuaLibFunction(
            context,
            LuaLibFeature.SparseArrayPush,
            undefined,
            listIdentifier,
            ...expressions
        );
        context.addPrecedingStatements(lua.createExpressionStatement(libCall));
    }
    return listIdentifier;
}

function transformExpressionsUsingList(
    context: TransformationContext,
    expressions: readonly ts.Expression[],
    transformedExpressions: lua.Expression[],
    precedingStatements: lua.Statement[][]
) {
    let listIdentifier: lua.Identifier | undefined;

    let expressionSet: lua.Expression[] = [];
    for (let i = 0; i < expressions.length; ++i) {
        if (precedingStatements[i].length > 0 && expressionSet.length > 0) {
            listIdentifier = pushToList(context, listIdentifier, expressionSet);
            expressionSet = [];
        }

        context.addPrecedingStatements(precedingStatements[i]);
        expressionSet.push(transformedExpressions[i]);

        if (ts.isSpreadElement(expressions[i])) {
            listIdentifier = pushToList(context, listIdentifier, expressionSet);
            expressionSet = [];
        }
    }

    if (expressionSet.length > 0) {
        listIdentifier = pushToList(context, listIdentifier, expressionSet);
    }

    assert(listIdentifier);
    return [transformLuaLibFunction(context, LuaLibFeature.SparseArraySpread, undefined, listIdentifier)];
}

function countTempCandidates(
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
        .filter((e, i) => shouldMoveToTemp(context, expressions[i], e)).length;
}

// Transforms a list of expressions while flattening spreads and maintaining execution order
export function transformExpressionList(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): lua.Expression[] {
    const [transformedExpressions, precedingStatements, lastPrecedingStatementsIndex] = transformExpressions(
        context,
        expressions
    );

    // If more than this number of temps are required to preserve execution order, we'll fall back to using the list
    // lib functions instead to prevent excessive locals.
    const maxTemps = 2;

    // Use list lib if there are spreads before the last expression or if too many temps are needed to preserve order
    const lastSpread = expressions.findIndex(e => ts.isSpreadElement(e));
    if (
        (lastSpread >= 0 && lastSpread < expressions.length - 1) ||
        countTempCandidates(context, expressions, transformedExpressions, lastPrecedingStatementsIndex) > maxTemps
    ) {
        return transformExpressionsUsingList(context, expressions, transformedExpressions, precedingStatements);
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
    const [transformedExpressions, precedingStatements, lastPrecedingStatementsIndex] = transformExpressions(
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
