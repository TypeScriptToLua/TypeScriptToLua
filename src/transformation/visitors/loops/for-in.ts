import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { forbiddenForIn } from "../../utils/diagnostics";
import { isArrayType } from "../../utils/typescript";
import { transformForInitializer, transformLoopBody } from "./utils";

export const transformForInStatement: FunctionVisitor<ts.ForInStatement> = (statement, context) => {
    if (isArrayType(context, context.checker.getTypeAtLocation(statement.expression))) {
        context.diagnostics.push(forbiddenForIn(statement));
    }

    // Transpile expression
    const pairsIdentifier = lua.createIdentifier("pairs");
    const expression = context.transformExpression(statement.expression);
    const pairsCall = lua.createCallExpression(pairsIdentifier, [expression]);

    const body = lua.createBlock(transformLoopBody(context, statement));

    const valueVariable = transformForInitializer(context, statement.initializer, body);
    return lua.createForInStatement(body, [valueVariable], [pairsCall], statement);
};
