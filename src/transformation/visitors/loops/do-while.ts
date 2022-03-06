import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { transformInPrecedingStatementScope } from "../../utils/preceding-statements";
import { checkOnlyTruthyCondition } from "../conditional";
import { invertCondition, transformLoopBody } from "./utils";

export const transformWhileStatement: FunctionVisitor<ts.WhileStatement> = (statement, context) => {
    // Check if we need to add diagnostic about Lua truthiness
    checkOnlyTruthyCondition(statement.expression, context);

    const body = transformLoopBody(context, statement);

    let [conditionPrecedingStatements, condition] = transformInPrecedingStatementScope(context, () =>
        context.transformExpression(statement.expression)
    );

    // If condition has preceding statements, ensure they are executed every iteration by using the form:
    //
    // while true do
    //     condition's preceding statements
    //     if not condition then
    //         break
    //     end
    //     ...
    // end
    if (conditionPrecedingStatements.length > 0) {
        conditionPrecedingStatements.push(
            lua.createIfStatement(
                invertCondition(condition),
                lua.createBlock([lua.createBreakStatement()]),
                undefined,
                statement.expression
            )
        );
        body.unshift(...conditionPrecedingStatements);
        condition = lua.createBooleanLiteral(true);
    }

    return lua.createWhileStatement(lua.createBlock(body), condition, statement);
};

export const transformDoStatement: FunctionVisitor<ts.DoStatement> = (statement, context) => {
    // Check if we need to add diagnostic about Lua truthiness
    checkOnlyTruthyCondition(statement.expression, context);

    const body = lua.createDoStatement(transformLoopBody(context, statement));

    let [conditionPrecedingStatements, condition] = transformInPrecedingStatementScope(context, () =>
        invertCondition(context.transformExpression(statement.expression))
    );

    // If condition has preceding statements, ensure they are executed every iteration by using the form:
    //
    // repeat
    //     ...
    //     condition's preceding statements
    //     if condition then
    //         break
    //     end
    // end
    if (conditionPrecedingStatements.length > 0) {
        conditionPrecedingStatements.push(
            lua.createIfStatement(
                condition,
                lua.createBlock([lua.createBreakStatement()]),
                undefined,
                statement.expression
            )
        );
        condition = lua.createBooleanLiteral(false);
    }

    return lua.createRepeatStatement(lua.createBlock([body, ...conditionPrecedingStatements]), condition, statement);
};
