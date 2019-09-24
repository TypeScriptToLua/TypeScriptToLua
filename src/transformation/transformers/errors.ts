import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformerPlugin } from "../context";
import { isInTupleReturnFunction } from "../utils/annotations";
import { InvalidThrowExpression } from "../utils/errors";
import { createUnpackCall } from "../utils/lua-ast";
import { findScope, ScopeType } from "../utils/scope";
import { isStringType } from "../utils/typescript";
import { transformScopeBlock } from "./block";
import { transformIdentifier } from "./identifier";

const transformTryStatement: FunctionVisitor<ts.TryStatement> = (statement, context) => {
    const [tryBlock, tryScope] = transformScopeBlock(context, statement.tryBlock, ScopeType.Try);

    const tryResultIdentifier = tstl.createIdentifier("____try");
    const returnValueIdentifier = tstl.createIdentifier("____returnValue");

    const result: tstl.Statement[] = [];

    let returnedIdentifier: tstl.Identifier | undefined;
    let returnCondition: tstl.Expression | undefined;

    const pCall = tstl.createIdentifier("pcall");
    const tryCall = tstl.createCallExpression(pCall, [tstl.createFunctionExpression(tryBlock)]);

    if (statement.catchClause && statement.catchClause.block.statements.length > 0) {
        // try with catch
        let [catchBlock, catchScope] = transformScopeBlock(context, statement.catchClause.block, ScopeType.Catch);
        if (statement.catchClause.variableDeclaration) {
            // Replace ____returned with catch variable
            returnedIdentifier = transformIdentifier(context, statement.catchClause.variableDeclaration
                .name as ts.Identifier);
        } else if (tryScope.functionReturned || catchScope.functionReturned) {
            returnedIdentifier = tstl.createIdentifier("____returned");
        }

        const tryReturnIdentifiers = [tryResultIdentifier]; // ____try
        if (returnedIdentifier) {
            tryReturnIdentifiers.push(returnedIdentifier); // ____returned or catch variable
            if (tryScope.functionReturned || catchScope.functionReturned) {
                tryReturnIdentifiers.push(returnValueIdentifier); // ____returnValue
                returnCondition = tstl.cloneIdentifier(returnedIdentifier);
            }
        }
        result.push(tstl.createVariableDeclarationStatement(tryReturnIdentifiers, tryCall));

        if ((tryScope.functionReturned || catchScope.functionReturned) && returnedIdentifier) {
            // Wrap catch in function if try or catch has return
            const catchCall = tstl.createCallExpression(
                tstl.createParenthesizedExpression(tstl.createFunctionExpression(catchBlock))
            );
            const catchAssign = tstl.createAssignmentStatement(
                [tstl.cloneIdentifier(returnedIdentifier), tstl.cloneIdentifier(returnValueIdentifier)],
                catchCall
            );
            catchBlock = tstl.createBlock([catchAssign]);
        }
        const notTryCondition = tstl.createUnaryExpression(
            tstl.createParenthesizedExpression(tryResultIdentifier),
            tstl.SyntaxKind.NotOperator
        );
        result.push(tstl.createIfStatement(notTryCondition, catchBlock));
    } else if (tryScope.functionReturned) {
        // try with return, but no catch
        returnedIdentifier = tstl.createIdentifier("____returned");
        const returnedVariables = [tryResultIdentifier, returnedIdentifier, returnValueIdentifier];
        result.push(tstl.createVariableDeclarationStatement(returnedVariables, tryCall));

        // change return condition from '____returned' to '____try and ____returned'
        returnCondition = tstl.createBinaryExpression(
            tstl.cloneIdentifier(tryResultIdentifier),
            returnedIdentifier,
            tstl.SyntaxKind.AndOperator
        );
    } else {
        // try without return or catch
        result.push(tstl.createExpressionStatement(tryCall));
    }

    if (statement.finallyBlock && statement.finallyBlock.statements.length > 0) {
        result.push(...context.transformStatements(statement.finallyBlock));
    }

    if (returnCondition && returnedIdentifier) {
        // With catch clause:
        //     if ____returned then return ____returnValue end
        // No catch clause:
        //     if ____try and ____returned then return ____returnValue end
        const returnValues: tstl.Expression[] = [];
        const parentTryCatch = findScope(context, ScopeType.Function | ScopeType.Try | ScopeType.Catch);
        if (parentTryCatch && parentTryCatch.type !== ScopeType.Function) {
            // Nested try/catch needs to prefix a 'true' return value
            returnValues.push(tstl.createBooleanLiteral(true));
        }

        if (isInTupleReturnFunction(context, statement)) {
            returnValues.push(createUnpackCall(context, tstl.cloneIdentifier(returnValueIdentifier)));
        } else {
            returnValues.push(tstl.cloneIdentifier(returnValueIdentifier));
        }

        const returnStatement = tstl.createReturnStatement(returnValues);
        const ifReturnedStatement = tstl.createIfStatement(returnCondition, tstl.createBlock([returnStatement]));
        result.push(ifReturnedStatement);
    }

    return tstl.createDoStatement(result, statement);
};

const transformThrowStatement: FunctionVisitor<ts.ThrowStatement> = (statement, context) => {
    if (statement.expression === undefined) {
        throw InvalidThrowExpression(statement);
    }

    const type = context.checker.getTypeAtLocation(statement.expression);
    if (!isStringType(context, type)) {
        throw InvalidThrowExpression(statement.expression);
    }

    const error = tstl.createIdentifier("error");
    return tstl.createExpressionStatement(
        tstl.createCallExpression(error, [context.transformExpression(statement.expression)]),
        statement
    );
};

export const errorsPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.TryStatement]: transformTryStatement,
        [ts.SyntaxKind.ThrowStatement]: transformThrowStatement,
    },
};
