import * as ts from "typescript";
import { LuaLibFeature, LuaTarget } from "../..";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { unsupportedForTarget, unsupportedForTargetButOverrideAvailable } from "../utils/diagnostics";
import { createUnpackCall } from "../utils/lua-ast";
import { transformLuaLibFunction } from "../utils/lualib";
import { findTryScopesBefore, Scope, ScopeType } from "../utils/scope";
import { isInAsyncFunction, isInGeneratorFunction } from "../utils/typescript";
import { wrapInAsyncAwaiter } from "./async-await";
import { createBreak, createContinue } from "./break-continue";
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
    const loopExit = createLoopExitChecks(context, tryScope, catchScope);

    // Build result in output order: flag declarations, awaiter, chain calls, post-checks
    const result: lua.Statement[] = [];

    const flagDecls: lua.Identifier[] = [];
    if (hasReturn) {
        flagDecls.push(lua.createIdentifier("____hasReturned"));
        flagDecls.push(lua.createIdentifier("____returnValue"));
    }
    flagDecls.push(...loopExit.flags);
    if (flagDecls.length > 0) {
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

    result.push(...loopExit.checks);

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
    const rethrowIdentifier = lua.createIdentifier("____rethrow");

    const result: lua.Statement[] = [];

    const catchClause =
        statement.catchClause && statement.catchClause.block.statements.length > 0 ? statement.catchClause : undefined;
    const [catchFunction, catchScope] = catchClause ? transformCatchClause(context, catchClause) : [];

    // A break or continue inside the try or catch block sets a flag, checked after the try statement
    const loopExit = createLoopExitChecks(context, tryScope, catchScope);
    if (loopExit.flags.length > 0) {
        result.push(lua.createVariableDeclarationStatement(loopExit.flags));
    }

    const returnedIdentifier = lua.createIdentifier("____hasReturned");
    let returnCondition: lua.Expression | undefined;

    const pCall = lua.createIdentifier("pcall");
    const tryCall = lua.createCallExpression(pCall, [lua.createFunctionExpression(tryBlock)]);

    if (catchClause && catchFunction && catchScope) {
        // try with catch
        const catchIdentifier = lua.createIdentifier("____catch");
        result.push(lua.createVariableDeclarationStatement(catchIdentifier, catchFunction));

        const hasReturn = tryScope.functionReturned ?? catchScope.functionReturned;

        const tryReturnIdentifiers = [tryResultIdentifier]; // ____try
        if (hasReturn || catchClause.variableDeclaration) {
            tryReturnIdentifiers.push(returnedIdentifier); // ____returned
            if (hasReturn) {
                tryReturnIdentifiers.push(returnValueIdentifier); // ____returnValue
                returnCondition = lua.cloneIdentifier(returnedIdentifier);
            }
        }
        result.push(lua.createVariableDeclarationStatement(tryReturnIdentifiers, tryCall));
        if (statement.finallyBlock) {
            result.push(lua.createVariableDeclarationStatement(rethrowIdentifier));
        }

        const catchCall = lua.createCallExpression(
            catchIdentifier,
            catchClause.variableDeclaration ? [lua.cloneIdentifier(returnedIdentifier)] : []
        );
        const catchCallStatement = hasReturn
            ? lua.createAssignmentStatement(
                  [lua.cloneIdentifier(returnedIdentifier), lua.cloneIdentifier(returnValueIdentifier)],
                  catchCall
              )
            : lua.createExpressionStatement(catchCall);

        const catchCallFunction = lua.createFunctionExpression(lua.createBlock([catchCallStatement]));

        const tryCatchCall = lua.createCallExpression(pCall, [catchCallFunction]);

        const tryCatchCallStatement = lua.createAssignmentStatement(
            [lua.cloneIdentifier(tryResultIdentifier), lua.cloneIdentifier(rethrowIdentifier)],
            tryCatchCall
        );

        const notTryCondition = lua.createUnaryExpression(tryResultIdentifier, lua.SyntaxKind.NotOperator);
        result.push(
            lua.createIfStatement(
                notTryCondition,
                lua.createBlock(statement.finallyBlock ? [tryCatchCallStatement] : [catchCallStatement])
            )
        );
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

    // Re-throw error if try had a finally.
    // On pcall failure the error is the second return value, which lands in
    // ____hasReturned (when functionReturned) or ____error (otherwise).
    if (statement.finallyBlock) {
        const notTryCondition = lua.createUnaryExpression(
            lua.cloneIdentifier(tryResultIdentifier),
            lua.SyntaxKind.NotOperator
        );

        if (!statement.catchClause) {
            const errorIdentifier = tryScope.functionReturned
                ? lua.cloneIdentifier(returnedIdentifier)
                : lua.createIdentifier("____error");
            const rethrow = lua.createExpressionStatement(
                lua.createCallExpression(lua.createIdentifier("error"), [errorIdentifier, lua.createNumericLiteral(0)])
            );
            result.push(lua.createIfStatement(notTryCondition, lua.createBlock([rethrow])));
        } else if (statement.catchClause.block.statements.length > 0) {
            // Re-throw is possible only from non-empty blocks.
            const rethrow = lua.createExpressionStatement(
                lua.createCallExpression(lua.createIdentifier("error"), [
                    rethrowIdentifier,
                    lua.createNumericLiteral(0),
                ])
            );
            result.push(lua.createIfStatement(notTryCondition, lua.createBlock([rethrow])));
        }
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

    result.push(...loopExit.checks);

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

/**
 * For a break or continue inside a try statement: the flags to declare before it, and the checks
 * that break or continue after it. Only the outermost try statement inside the loop (or switch)
 * declares a flag; a nested one shares it and returns from the enclosing try function instead.
 */
function createLoopExitChecks(
    context: TransformationContext,
    tryScope: Scope,
    catchScope: Scope | undefined
): { flags: lua.Identifier[]; checks: lua.Statement[] } {
    const flags: lua.Identifier[] = [];
    const checks: lua.Statement[] = [];

    if (tryScope.tryHasBreak ?? catchScope?.tryHasBreak) {
        if (findTryScopesBefore(context, ScopeType.Loop | ScopeType.Switch).length === 0) {
            flags.push(lua.createIdentifier("____hasBroken"));
        }
        const exit = createBreak(context, undefined, true);
        checks.push(lua.createIfStatement(lua.createIdentifier("____hasBroken"), lua.createBlock(exit)));
    }

    if ((tryScope.tryHasContinue ?? catchScope?.tryHasContinue) !== undefined) {
        if (findTryScopesBefore(context, ScopeType.Loop).length === 0) {
            flags.push(lua.createIdentifier("____hasContinued"));
        }
        const exit = createContinue(context, undefined, true);
        checks.push(lua.createIfStatement(lua.createIdentifier("____hasContinued"), lua.createBlock(exit)));
    }

    return { flags, checks };
}

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
