import * as ts from "typescript";
import { LuaLibFeature, LuaTarget } from "../..";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { unsupportedForTarget, unsupportedForTargetButOverrideAvailable } from "../utils/diagnostics";
import { createUnpackCall } from "../utils/lua-ast";
import { importLuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { findScope, LoopContinued, Scope, ScopeType } from "../utils/scope";
import { isInAsyncFunction, isInGeneratorFunction } from "../utils/typescript";
import { wrapInAsyncAwaiter } from "./async-await";
import { transformScopeBlock } from "./block";
import { transformIdentifier } from "./identifier";
import { isInMultiReturnFunction } from "./language-extensions/multi";
import { createReturnStatement } from "./return";

const transformAsyncTry: FunctionVisitor<ts.TryStatement> = (statement, context) => {
    const [tryBlock, tryScope] = transformScopeBlock(context, statement.tryBlock, ScopeType.Try);

    if (
        (context.options.luaTarget === LuaTarget.Lua50 || context.options.luaTarget === LuaTarget.Lua51) &&
        !context.options.lua51AllowTryCatchInAsyncAwait
    ) {
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

    // __TS__AsyncAwaiter(<try block>)
    const awaiter = wrapInAsyncAwaiter(context, tryBlock.statements, false);
    const awaiterIdentifier = lua.createIdentifier("____try");
    const awaiterDefinition = lua.createVariableDeclarationStatement(awaiterIdentifier, awaiter);

    // Transform catch/finally and collect scope info before building the result
    let catchScope: Scope | undefined;
    const chainCalls: lua.Statement[] = [];

    if (statement.catchClause) {
        // ____try = ____try.catch(<catch function>)
        const [catchFunction, cScope] = transformCatchClause(context, statement.catchClause);
        catchScope = cScope;
        if (catchFunction.params) {
            catchFunction.params.unshift(lua.createAnonymousIdentifier());
        }

        const catchBodyStatements = catchFunction.body ? catchFunction.body.statements : [];
        const asyncWrappedCatch = wrapInAsyncAwaiter(context, [...catchBodyStatements], false);
        catchFunction.body = lua.createBlock([lua.createReturnStatement([asyncWrappedCatch])]);

        const awaiterCatch = lua.createTableIndexExpression(awaiterIdentifier, lua.createStringLiteral("catch"));
        const catchCall = lua.createCallExpression(awaiterCatch, [awaiterIdentifier, catchFunction]);
        chainCalls.push(lua.createAssignmentStatement(lua.cloneIdentifier(awaiterIdentifier), catchCall));
    }

    if (statement.finallyBlock) {
        // ____try = ____try.finally(<finally function>)
        const finallyStatements = context.transformStatements(statement.finallyBlock.statements);
        const asyncWrappedFinally = wrapInAsyncAwaiter(context, finallyStatements, false);
        const finallyFunction = lua.createFunctionExpression(
            lua.createBlock([lua.createReturnStatement([asyncWrappedFinally])])
        );

        const awaiterFinally = lua.createTableIndexExpression(awaiterIdentifier, lua.createStringLiteral("finally"));
        const finallyCall = lua.createCallExpression(
            awaiterFinally,
            [awaiterIdentifier, finallyFunction],
            statement.finallyBlock
        );
        chainCalls.push(lua.createAssignmentStatement(lua.cloneIdentifier(awaiterIdentifier), finallyCall));
    }

    // __TS__Await(____try)
    const promiseAwait = transformLuaLibFunction(context, LuaLibFeature.Await, statement, awaiterIdentifier);
    chainCalls.push(lua.createExpressionStatement(promiseAwait, statement));

    const hasReturn = tryScope.asyncTryHasReturn ?? catchScope?.asyncTryHasReturn;
    const hasBreak = tryScope.asyncTryHasBreak ?? catchScope?.asyncTryHasBreak;
    const hasContinue = tryScope.asyncTryHasContinue ?? catchScope?.asyncTryHasContinue;

    // Build result in output order: flag declarations, awaiter, chain calls, post-checks
    const result: lua.Statement[] = [];

    if (hasReturn || hasBreak || hasContinue !== undefined) {
        const flagDecls: lua.Identifier[] = [];
        if (hasReturn) {
            flagDecls.push(lua.createIdentifier("____hasReturned"));
            flagDecls.push(lua.createIdentifier("____returnValue"));
        }
        if (hasBreak) {
            flagDecls.push(lua.createIdentifier("____hasBroken"));
        }
        if (hasContinue !== undefined) {
            flagDecls.push(lua.createIdentifier("____hasContinued"));
        }
        result.push(lua.createVariableDeclarationStatement(flagDecls));
    }

    result.push(awaiterDefinition);
    result.push(...chainCalls);

    if (hasReturn) {
        result.push(
            lua.createIfStatement(
                lua.createIdentifier("____hasReturned"),
                lua.createBlock([createReturnStatement(context, [lua.createIdentifier("____returnValue")], statement)])
            )
        );
    }

    if (hasBreak) {
        result.push(
            lua.createIfStatement(lua.createIdentifier("____hasBroken"), lua.createBlock([lua.createBreakStatement()]))
        );
    }

    if (hasContinue !== undefined) {
        const loopScope = findScope(context, ScopeType.Loop);
        const label = `__continue${loopScope?.id ?? ""}`;

        const continueStatements: lua.Statement[] = [];
        switch (hasContinue) {
            case LoopContinued.WithGoto:
                continueStatements.push(lua.createGotoStatement(label));
                break;
            case LoopContinued.WithContinue:
                continueStatements.push(lua.createContinueStatement());
                break;
            case LoopContinued.WithRepeatBreak:
                continueStatements.push(
                    lua.createAssignmentStatement(lua.createIdentifier(label), lua.createBooleanLiteral(true))
                );
                continueStatements.push(lua.createBreakStatement());
                break;
        }

        result.push(
            lua.createIfStatement(lua.createIdentifier("____hasContinued"), lua.createBlock(continueStatements))
        );
    }

    return result;
};

export const transformTryStatement: FunctionVisitor<ts.TryStatement> = (statement, context) => {
    if (isInAsyncFunction(statement)) {
        return transformAsyncTry(statement, context);
    }

    const [tryBlock, tryScope] = transformScopeBlock(context, statement.tryBlock, ScopeType.Try);

    if (
        (context.options.luaTarget === LuaTarget.Lua50 || context.options.luaTarget === LuaTarget.Lua51) &&
        isInGeneratorFunction(statement)
    ) {
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

    // On Lua 5.5 (and Universal, which must work on 5.5), a `nil` error object
    // is replaced by a string when it propagates out of a protected call. To
    // preserve `throw undefined` semantics, route through xpcall with a message
    // handler that wraps nil into a sentinel, and unwrap before the user catch.
    // See: https://www.lua.org/manual/5.5/manual.html#8.1
    // const wrapErrorObjects =
    //     context.options.luaTarget === LuaTarget.Lua55 || context.options.luaTarget === LuaTarget.Universal;
    const wrapErrorObjects = false;
    if (wrapErrorObjects) {
        importLuaLibFeature(context, LuaLibFeature.ErrorObject);
    }

    const tryCall = wrapErrorObjects
        ? lua.createCallExpression(lua.createIdentifier("xpcall"), [
              lua.createFunctionExpression(tryBlock),
              lua.createIdentifier("__TS__WrapErrorObject"),
          ])
        : lua.createCallExpression(lua.createIdentifier("pcall"), [lua.createFunctionExpression(tryBlock)]);

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

        const catchArg = wrapErrorObjects
            ? lua.createCallExpression(lua.createIdentifier("__TS__UnwrapErrorObject"), [
                  lua.cloneIdentifier(returnedIdentifier),
              ])
            : lua.cloneIdentifier(returnedIdentifier);
        const catchCall = lua.createCallExpression(
            catchIdentifier,
            statement.catchClause.variableDeclaration ? [catchArg] : []
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
    } else if (statement.finallyBlock) {
        // try without catch, but with finally — need to capture error for re-throw
        const errorIdentifier = lua.createIdentifier("____error");
        result.push(lua.createVariableDeclarationStatement([tryResultIdentifier, errorIdentifier], tryCall));
    } else {
        // try without return or catch
        result.push(lua.createExpressionStatement(tryCall));
    }

    if (statement.finallyBlock && statement.finallyBlock.statements.length > 0) {
        result.push(...context.transformStatements(statement.finallyBlock));
    }

    // Re-throw error if try had no catch but had a finally.
    // On pcall failure the error is the second return value, which lands in
    // ____hasReturned (when functionReturned) or ____error (otherwise).
    if (!statement.catchClause && statement.finallyBlock) {
        const notTryCondition = lua.createUnaryExpression(
            lua.cloneIdentifier(tryResultIdentifier),
            lua.SyntaxKind.NotOperator
        );
        const errorIdentifier = tryScope.functionReturned
            ? lua.cloneIdentifier(returnedIdentifier)
            : lua.createIdentifier("____error");
        const rethrow = lua.createExpressionStatement(
            lua.createCallExpression(lua.createIdentifier("error"), [errorIdentifier, lua.createNumericLiteral(0)])
        );
        result.push(lua.createIfStatement(notTryCondition, lua.createBlock([rethrow])));
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
