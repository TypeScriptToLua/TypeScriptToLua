import * as ts from "typescript";
import { LuaLibFeature, LuaTarget } from "../..";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { unsupportedForTarget, unsupportedForTargetButOverrideAvailable } from "../utils/diagnostics";
import { createUnpackCall } from "../utils/lua-ast";
import { transformLuaLibFunction } from "../utils/lualib";
import { Scope, ScopeType } from "../utils/scope";
import { isInAsyncFunction, isInGeneratorFunction } from "../utils/typescript";
import { wrapInAsyncAwaiter } from "./async-await";
import { transformScopeBlock } from "./block";
import { transformIdentifier } from "./identifier";
import { isInMultiReturnFunction } from "./language-extensions/multi";
import { createReturnStatement } from "./return";

const transformAsyncTry: FunctionVisitor<ts.TryStatement> = (statement, context) => {
    const [tryBlock] = transformScopeBlock(context, statement.tryBlock, ScopeType.Try);

    if (context.options.luaTarget === LuaTarget.Lua51 && !context.options.lua51AllowTryCatchInAsyncAwait) {
        context.diagnostics.push(
            unsupportedForTargetButOverrideAvailable(
                statement,
                "try/catch inside async functions",
                LuaTarget.Lua51,
                "lua51AllowTryCatchInAsyncAwait"
            )
        );
        return tryBlock.statements;
    }

    // __TS__AsyncAwaiter(<catch block>)
    const awaiter = wrapInAsyncAwaiter(context, tryBlock.statements, false);
    const awaiterIdentifier = lua.createIdentifier("____try");
    const awaiterDefinition = lua.createVariableDeclarationStatement(awaiterIdentifier, awaiter);

    // local ____try = __TS__AsyncAwaiter(<catch block>)
    const result: lua.Statement[] = [awaiterDefinition];

    if (statement.finallyBlock) {
        const awaiterFinally = lua.createTableIndexExpression(awaiterIdentifier, lua.createStringLiteral("finally"));
        const finallyFunction = lua.createFunctionExpression(
            lua.createBlock(context.transformStatements(statement.finallyBlock.statements))
        );
        const finallyCall = lua.createCallExpression(
            awaiterFinally,
            [awaiterIdentifier, finallyFunction],
            statement.finallyBlock
        );
        // ____try.finally(<finally function>)
        result.push(lua.createExpressionStatement(finallyCall));
    }

    if (statement.catchClause) {
        // ____try.catch(<catch function>)
        const [catchFunction] = transformCatchClause(context, statement.catchClause);
        if (catchFunction.params) {
            catchFunction.params.unshift(lua.createAnonymousIdentifier());
        }

        const awaiterCatch = lua.createTableIndexExpression(awaiterIdentifier, lua.createStringLiteral("catch"));
        const catchCall = lua.createCallExpression(awaiterCatch, [awaiterIdentifier, catchFunction]);

        // await ____try.catch(<catch function>)
        const promiseAwait = transformLuaLibFunction(context, LuaLibFeature.Await, statement, catchCall);
        result.push(lua.createExpressionStatement(promiseAwait, statement));
    } else {
        // await ____try
        const promiseAwait = transformLuaLibFunction(context, LuaLibFeature.Await, statement, awaiterIdentifier);
        result.push(lua.createExpressionStatement(promiseAwait, statement));
    }

    return result;
};

export const transformTryStatement: FunctionVisitor<ts.TryStatement> = (statement, context) => {
    if (isInAsyncFunction(statement)) {
        return transformAsyncTry(statement, context);
    }

    const [tryBlock, tryScope] = transformScopeBlock(context, statement.tryBlock, ScopeType.Try);

    if (context.options.luaTarget === LuaTarget.Lua51 && isInGeneratorFunction(statement)) {
        context.diagnostics.push(
            unsupportedForTarget(statement, "try/catch inside generator functions", LuaTarget.Lua51)
        );
        return tryBlock.statements;
    }

    const tryResultIdentifier = lua.createIdentifier("____try");
    const returnValueIdentifier = lua.createIdentifier("____returnValue");

    const result: lua.Statement[] = [];

    const returnedIdentifier = lua.createIdentifier("____hasReturned");
    let returnCondition: lua.Expression | undefined;

    const pCall = lua.createIdentifier("pcall");
    const tryCall = lua.createCallExpression(pCall, [lua.createFunctionExpression(tryBlock)]);

    if (statement.catchClause && statement.catchClause.block.statements.length > 0) {
        // try with catch
        const [catchFunction, catchScope] = transformCatchClause(context, statement.catchClause);
        const catchIdentifier = lua.createIdentifier("____catch");
        result.push(lua.createVariableDeclarationStatement(catchIdentifier, catchFunction));

        const hasReturn = tryScope.functionReturned ?? catchScope.functionReturned;

        const tryReturnIdentifiers = [tryResultIdentifier]; // ____try
        if (hasReturn || statement.catchClause.variableDeclaration) {
            tryReturnIdentifiers.push(returnedIdentifier); // ____returned
            if (hasReturn) {
                tryReturnIdentifiers.push(returnValueIdentifier); // ____returnValue
                returnCondition = lua.cloneIdentifier(returnedIdentifier);
            }
        }
        result.push(lua.createVariableDeclarationStatement(tryReturnIdentifiers, tryCall));

        const catchCall = lua.createCallExpression(
            catchIdentifier,
            statement.catchClause.variableDeclaration ? [lua.cloneIdentifier(returnedIdentifier)] : []
        );
        const catchCallStatement = hasReturn
            ? lua.createAssignmentStatement(
                  [lua.cloneIdentifier(returnedIdentifier), lua.cloneIdentifier(returnValueIdentifier)],
                  catchCall
              )
            : lua.createExpressionStatement(catchCall);

        const notTryCondition = lua.createUnaryExpression(tryResultIdentifier, lua.SyntaxKind.NotOperator);
        result.push(lua.createIfStatement(notTryCondition, lua.createBlock([catchCallStatement])));
    } else if (tryScope.functionReturned) {
        // try with return, but no catch
        // returnedIdentifier = lua.createIdentifier("____returned");
        const returnedVariables = [tryResultIdentifier, returnedIdentifier, returnValueIdentifier];
        result.push(lua.createVariableDeclarationStatement(returnedVariables, tryCall));

        // change return condition from '____returned' to '____try and ____returned'
        returnCondition = lua.createBinaryExpression(
            lua.cloneIdentifier(tryResultIdentifier),
            returnedIdentifier,
            lua.SyntaxKind.AndOperator
        );
    } else {
        // try without return or catch
        result.push(lua.createExpressionStatement(tryCall));
    }

    if (statement.finallyBlock && statement.finallyBlock.statements.length > 0) {
        result.push(...context.transformStatements(statement.finallyBlock));
    }

    if (returnCondition && returnedIdentifier) {
        const returnValues: lua.Expression[] = [];

        if (isInMultiReturnFunction(context, statement)) {
            returnValues.push(createUnpackCall(context, lua.cloneIdentifier(returnValueIdentifier)));
        } else {
            returnValues.push(lua.cloneIdentifier(returnValueIdentifier));
        }

        const returnStatement = createReturnStatement(context, returnValues, statement);
        const ifReturnedStatement = lua.createIfStatement(returnCondition, lua.createBlock([returnStatement]));
        result.push(ifReturnedStatement);
    }

    return lua.createDoStatement(result, statement);
};

export const transformThrowStatement: FunctionVisitor<ts.ThrowStatement> = (statement, context) => {
    const parameters: lua.Expression[] = [];

    if (statement.expression) {
        parameters.push(context.transformExpression(statement.expression));
        parameters.push(lua.createNumericLiteral(0));
    }

    return lua.createExpressionStatement(
        lua.createCallExpression(lua.createIdentifier("error"), parameters),
        statement
    );
};

function transformCatchClause(
    context: TransformationContext,
    catchClause: ts.CatchClause
): [lua.FunctionExpression, Scope] {
    const [catchBlock, catchScope] = transformScopeBlock(context, catchClause.block, ScopeType.Catch);

    const catchParameter = catchClause.variableDeclaration
        ? transformIdentifier(context, catchClause.variableDeclaration.name as ts.Identifier)
        : undefined;
    const catchFunction = lua.createFunctionExpression(
        catchBlock,
        catchParameter ? [lua.cloneIdentifier(catchParameter)] : []
    );

    return [catchFunction, catchScope];
}
