import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { ForbiddenForIn, UnsupportedForInVariable } from "../../utils/errors";
import { isArrayType } from "../../utils/typescript";
import { transformIdentifier } from "../identifier";
import { transformLoopBody } from "./body";

export const transformForInStatement: FunctionVisitor<ts.ForInStatement> = (statement, context) => {
    if (isArrayType(context, context.checker.getTypeAtLocation(statement.expression))) {
        throw ForbiddenForIn(statement);
    }

    // Transpile expression
    const pairsIdentifier = tstl.createIdentifier("pairs");
    const expression = context.transformExpression(statement.expression);
    const pairsCall = tstl.createCallExpression(pairsIdentifier, [expression]);

    const body = tstl.createBlock(transformLoopBody(context, statement));

    // Transform iteration variable
    // TODO: After the transformation pipeline refactor we should look at refactoring this together with the
    // for-of initializer transformation.
    let iterationVariable: tstl.Identifier;
    if (
        ts.isVariableDeclarationList(statement.initializer) &&
        ts.isIdentifier(statement.initializer.declarations[0].name)
    ) {
        iterationVariable = transformIdentifier(context, statement.initializer.declarations[0].name);
    } else if (ts.isIdentifier(statement.initializer)) {
        // Iteration variable becomes ____key
        iterationVariable = tstl.createIdentifier("____key");
        // Push variable = ____key to the start of the loop body to match TS scoping
        const initializer = tstl.createAssignmentStatement(
            transformIdentifier(context, statement.initializer),
            iterationVariable
        );
        body.statements.unshift(initializer);
    } else {
        // This should never occur
        throw UnsupportedForInVariable(statement.initializer);
    }

    return tstl.createForInStatement(body, [iterationVariable], [pairsCall], statement);
};
