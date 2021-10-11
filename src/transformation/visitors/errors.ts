import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { createUnpackCall } from "../utils/lua-ast";
import { ScopeType } from "../utils/scope";
import { transformScopeBlock } from "./block";
import { transformIdentifier } from "./identifier";
import { isInMultiReturnFunction } from "./language-extensions/multi";
import { createReturnStatement } from "./return";

export const transformTryStatement: FunctionVisitor<ts.TryStatement> = (statement, context) => {
    const [tryBlock, tryScope] = transformScopeBlock(context, statement.tryBlock, ScopeType.Try);

    const tryResultIdentifier = lua.createIdentifier("____try");
    const returnValueIdentifier = lua.createIdentifier("____returnValue");

    const result: lua.Statement[] = [];

    const returnedIdentifier = lua.createIdentifier("____hasReturned");
    let returnCondition: lua.Expression | undefined;

    const pCall = lua.createIdentifier("pcall");
    const tryCall = lua.createCallExpression(pCall, [lua.createFunctionExpression(tryBlock)]);

    if (statement.catchClause && statement.catchClause.block.statements.length > 0) {
        // try with catch
        const [catchBlock, catchScope] = transformScopeBlock(context, statement.catchClause.block, ScopeType.Catch);

        const catchParameter = statement.catchClause.variableDeclaration
            ? transformIdentifier(context, statement.catchClause.variableDeclaration.name as ts.Identifier)
            : undefined;
        const catchParameters = () => (catchParameter ? [lua.cloneIdentifier(catchParameter)] : []);

        const catchIdentifier = lua.createIdentifier("____catch");
        const catchFunction = lua.createFunctionExpression(catchBlock, catchParameters());
        result.push(lua.createVariableDeclarationStatement(catchIdentifier, catchFunction));

        const tryReturnIdentifiers = [tryResultIdentifier]; // ____try
        if (returnedIdentifier) {
            tryReturnIdentifiers.push(returnedIdentifier); // ____returned or catch variable
            if (tryScope.functionReturned || catchScope.functionReturned) {
                tryReturnIdentifiers.push(returnValueIdentifier); // ____returnValue
                returnCondition = lua.cloneIdentifier(returnedIdentifier);
            }
        }
        result.push(lua.createVariableDeclarationStatement(tryReturnIdentifiers, tryCall));

        // Wrap catch in function if try or catch has return
        const catchCall = lua.createCallExpression(catchIdentifier, [lua.cloneIdentifier(returnedIdentifier)]);
        const catchAssign = lua.createAssignmentStatement(
            [lua.cloneIdentifier(returnedIdentifier), lua.cloneIdentifier(returnValueIdentifier)],
            catchCall
        );

        const notTryCondition = lua.createUnaryExpression(tryResultIdentifier, lua.SyntaxKind.NotOperator);
        result.push(lua.createIfStatement(notTryCondition, lua.createBlock([catchAssign])));
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
