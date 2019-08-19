import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { FunctionVisitor, TransformerPlugin } from "../../context";
import { ForbiddenForIn } from "../../utils/errors";
import { isArrayType } from "../../utils/typescript";
import { transformLoopBody } from "./body";
import { transformIdentifier } from "../identifier";

const transformForInStatement: FunctionVisitor<ts.ForInStatement> = (statement, context) => {
    if (isArrayType(context, context.checker.getTypeAtLocation(statement.expression))) {
        throw ForbiddenForIn(statement);
    }

    // Get variable identifier
    const variable = (statement.initializer as ts.VariableDeclarationList).declarations[0];
    const identifier = variable.name as ts.Identifier;

    // Transpile expression
    const pairsIdentifier = tstl.createIdentifier("pairs");
    const expression = context.transformExpression(statement.expression);
    const pairsCall = tstl.createCallExpression(pairsIdentifier, [expression]);

    const body = tstl.createBlock(transformLoopBody(context, statement));

    return tstl.createForInStatement(body, [transformIdentifier(context, identifier)], [pairsCall], statement);
};

export const forInPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.ForInStatement]: transformForInStatement,
    },
};
