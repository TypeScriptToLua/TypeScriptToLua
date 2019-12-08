import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { isInTupleReturnFunction } from "../utils/annotations";
import { createUnpackCall } from "../utils/lua-ast";
import { findScope, ScopeType } from "../utils/scope";
import { transformScopeBlock } from "./block";
import { transformIdentifier } from "./identifier";

export const transformTryStatement: FunctionVisitor<ts.TryStatement> = (statement, context) => {
    const [tryBlock, tryScope] = transformScopeBlock(context, statement.tryBlock, ScopeType.Try);

    const tryResultIdentifier = lua.createIdentifier("____try");
    const returnValueIdentifier = lua.createIdentifier("____returnValue");

    const result: lua.Statement[] = [];

    let returnedIdentifier: lua.Identifier | undefined;
    let returnCondition: lua.Expression | undefined;

    const pCall = lua.createIdentifier("pcall");
    const tryCall = lua.createCallExpression(pCall, [lua.createFunctionExpression(tryBlock)]);

    if (statement.catchClause && statement.catchClause.block.statements.length > 0) {
        // try with catch
        let [catchBlock, catchScope] = transformScopeBlock(context, statement.catchClause.block, ScopeType.Catch);
        if (statement.catchClause.variableDeclaration) {
            // Replace ____returned with catch variable
            returnedIdentifier = transformIdentifier(
                context,
                statement.catchClause.variableDeclaration.name as ts.Identifier
            );
        } else if (tryScope.functionReturned || catchScope.functionReturned) {
            returnedIdentifier = lua.createIdentifier("____returned");
        }

        const tryReturnIdentifiers = [tryResultIdentifier]; // ____try
        if (returnedIdentifier) {
            tryReturnIdentifiers.push(returnedIdentifier); // ____returned or catch variable
            if (tryScope.functionReturned || catchScope.functionReturned) {
                tryReturnIdentifiers.push(returnValueIdentifier); // ____returnValue
                returnCondition = lua.cloneIdentifier(returnedIdentifier);
            }
        }
        result.push(lua.createVariableDeclarationStatement(tryReturnIdentifiers, tryCall));

        if ((tryScope.functionReturned || catchScope.functionReturned) && returnedIdentifier) {
            // Wrap catch in function if try or catch has return
            const catchCall = lua.createCallExpression(
                lua.createParenthesizedExpression(lua.createFunctionExpression(catchBlock))
            );
            const catchAssign = lua.createAssignmentStatement(
                [lua.cloneIdentifier(returnedIdentifier), lua.cloneIdentifier(returnValueIdentifier)],
                catchCall
            );
            catchBlock = lua.createBlock([catchAssign]);
        }
        const notTryCondition = lua.createUnaryExpression(
            lua.createParenthesizedExpression(tryResultIdentifier),
            lua.SyntaxKind.NotOperator
        );
        result.push(lua.createIfStatement(notTryCondition, catchBlock));
    } else if (tryScope.functionReturned) {
        // try with return, but no catch
        returnedIdentifier = lua.createIdentifier("____returned");
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
        // With catch clause:
        //     if ____returned then return ____returnValue end
        // No catch clause:
        //     if ____try and ____returned then return ____returnValue end
        const returnValues: lua.Expression[] = [];
        const parentTryCatch = findScope(context, ScopeType.Function | ScopeType.Try | ScopeType.Catch);
        if (parentTryCatch && parentTryCatch.type !== ScopeType.Function) {
            // Nested try/catch needs to prefix a 'true' return value
            returnValues.push(lua.createBooleanLiteral(true));
        }

        if (isInTupleReturnFunction(context, statement)) {
            returnValues.push(createUnpackCall(context, lua.cloneIdentifier(returnValueIdentifier)));
        } else {
            returnValues.push(lua.cloneIdentifier(returnValueIdentifier));
        }

        const returnStatement = lua.createReturnStatement(returnValues);
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
