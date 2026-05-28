import * as ts from "typescript";
import { LuaLibFeature, LuaTarget } from "../..";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { unsupportedForTarget, unsupportedForTargetButOverrideAvailable } from "../utils/diagnostics";
import { createUnpackCall } from "../utils/lua-ast";
import { transformLuaLibFunction } from "../utils/lualib";
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

    const tsTryBlock = statement.tryBlock;
    const tsCatchClause = statement.catchClause;
    const [tryBlock] = transformScopeBlock(context, tsTryBlock, ScopeType.Try);

    if (
        (context.options.luaTarget === LuaTarget.Lua50 || context.options.luaTarget === LuaTarget.Lua51) &&
        isInGeneratorFunction(statement)
    ) {
        context.diagnostics.push(
            unsupportedForTarget(statement, "try/catch inside generator functions", LuaTarget.Lua51)
        );
        return tryBlock.statements;
    }

    const trySuccessIdentifier = lua.createIdentifier("____trySuccess", tsTryBlock);
    const catchSuccessIdentifier = lua.createIdentifier("____catchSuccess", tsCatchClause);
    const hasReturnOrErrorIdentifier = lua.createIdentifier("____hasReturnOrError", tsTryBlock);
    const returnValueIdentifier = lua.createIdentifier("____returnValue", tsTryBlock);

    const result: lua.Statement[] = [];

    // pcall(function() ... end)
    const tryPCall = lua.createIdentifier("pcall", tsTryBlock);
    const tryCall = lua.createCallExpression(tryPCall, [lua.createFunctionExpression(tryBlock)], tsTryBlock);
    // ____trySuccess, ____hasReturnOrError, ____returnValue
    const tryReturnIdentifiers = [trySuccessIdentifier, hasReturnOrErrorIdentifier, returnValueIdentifier];
    result.push(lua.createVariableDeclarationStatement(tryReturnIdentifiers, tryCall, tsTryBlock));

    const hasCatch = tsCatchClause && tsCatchClause.block.statements.length > 0;
    if (hasCatch) {
        // local ____catchSuccess
        result.push(lua.createVariableDeclarationStatement(catchSuccessIdentifier, undefined, tsCatchClause));

        const [catchFunction] = transformCatchClause(context, tsCatchClause);

        const catchIdentifier = lua.createIdentifier("____catch", tsCatchClause);
        result.push(lua.createVariableDeclarationStatement(catchIdentifier, catchFunction, tsCatchClause));

        // pcall(____catch, ____hasReturnOrError)
        const catchPCall = lua.createIdentifier("pcall", tsCatchClause);
        const catchCall = lua.createCallExpression(
            catchPCall,
            [catchIdentifier, lua.cloneIdentifier(hasReturnOrErrorIdentifier, tsCatchClause)],
            tsTryBlock
        );

        // ____catchSuccess, ____hasReturnOrError, ____returnValue
        //     = pcall(____catch, ____hasReturnOrError)
        const catchAssign = lua.createAssignmentStatement(
            [
                lua.cloneIdentifier(catchSuccessIdentifier, tsCatchClause),
                lua.cloneIdentifier(hasReturnOrErrorIdentifier, tsCatchClause),
                lua.cloneIdentifier(returnValueIdentifier, tsCatchClause),
            ],
            catchCall,
            tsCatchClause
        );

        // if not ____trySuccess then
        //     ____catchSuccess, ____hasReturnOrError, ____returnValue
        //         = pcall(____catch, ____hasReturnOrError)
        // end
        const notTryCondition = lua.createUnaryExpression(trySuccessIdentifier, lua.SyntaxKind.NotOperator, tsTryBlock);
        result.push(
            lua.createIfStatement(notTryCondition, lua.createBlock([catchAssign], tsCatchClause), undefined, tsTryBlock)
        );
    }

    if (statement.finallyBlock && statement.finallyBlock.statements.length > 0) {
        result.push(...context.transformStatements(statement.finallyBlock));
    }

    // if ____hasReturnOrError then
    //     return ____returnValue
    // end
    const tryReturnValues: lua.Expression[] = [];
    if (isInMultiReturnFunction(context, statement)) {
        tryReturnValues.push(createUnpackCall(context, lua.cloneIdentifier(returnValueIdentifier, statement)));
    } else {
        tryReturnValues.push(lua.cloneIdentifier(returnValueIdentifier, statement));
    }

    const returnStatement = createReturnStatement(context, tryReturnValues, statement);
    const ifTryReturnStatement = lua.createIfStatement(
        lua.cloneIdentifier(hasReturnOrErrorIdentifier, statement),
        lua.createBlock([returnStatement], statement),
        undefined,
        statement
    );
    const trySuccessBlock = lua.createBlock([ifTryReturnStatement], statement);

    // error(____hasReturnOrError, 0)
    const rethrow = lua.createExpressionStatement(
        lua.createCallExpression(
            lua.createIdentifier("error"),
            [lua.cloneIdentifier(hasReturnOrErrorIdentifier, statement), lua.createNumericLiteral(0)],
            statement.catchClause ?? statement.tryBlock
        ),
        statement.tryBlock
    );
    const throwBlock = lua.createBlock([rethrow], statement);

    let ifCatchSuccessStatement: lua.IfStatement | undefined;
    if (hasCatch) {
        // if ____hasReturnOrError then
        //     return ____returnValue
        // end
        const catchReturnValues: lua.Expression[] = [];
        if (isInMultiReturnFunction(context, statement)) {
            catchReturnValues.push(createUnpackCall(context, lua.cloneIdentifier(returnValueIdentifier, statement)));
        } else {
            catchReturnValues.push(lua.cloneIdentifier(returnValueIdentifier, statement));
        }

        const catchReturnStatement = createReturnStatement(context, catchReturnValues, statement);
        const ifCatchReturnStatement = lua.createIfStatement(
            lua.cloneIdentifier(hasReturnOrErrorIdentifier, statement),
            lua.createBlock([catchReturnStatement], statement),
            undefined,
            statement
        );
        const catchSuccessBlock = lua.createBlock([ifCatchReturnStatement], statement);

        ifCatchSuccessStatement = lua.createIfStatement(
            lua.cloneIdentifier(catchSuccessIdentifier, statement),
            catchSuccessBlock,
            throwBlock,
            statement
        );
    }

    // if ____trySuccess then
    //     if ____hasReturnOrError then
    //         return ____returnValue
    //     end
    // elseif ____catchSuccess then
    //     if ____hasReturnOrError then
    //         return ____returnValue
    //     end
    // else
    //     error(____hasReturnOrError, 0)
    // end
    const ifTrySuccessStatement = lua.createIfStatement(
        lua.cloneIdentifier(trySuccessIdentifier, statement),
        trySuccessBlock,
        ifCatchSuccessStatement ?? (tsCatchClause ? undefined : throwBlock),
        statement
    );
    result.push(ifTrySuccessStatement);

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
