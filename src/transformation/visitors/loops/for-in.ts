import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { forbiddenForIn } from "../../utils/diagnostics";
import { isArrayType } from "../../utils/typescript";
import { transformIdentifier } from "../identifier";
import { transformAssignment } from "../binary-expression/assignments";
import { getVariableDeclarationBinding, transformLoopBody } from "./utils";

export const transformForInStatement: FunctionVisitor<ts.ForInStatement> = (statement, context) => {
    if (isArrayType(context, context.checker.getTypeAtLocation(statement.expression))) {
        context.diagnostics.push(forbiddenForIn(statement));
    }

    // Transpile expression
    const pairsIdentifier = lua.createIdentifier("pairs");
    const expression = context.transformExpression(statement.expression);
    const pairsCall = lua.createCallExpression(pairsIdentifier, [expression]);

    const body = lua.createBlock(transformLoopBody(context, statement));

    // Transform iteration variable
    // TODO: After the transformation pipeline refactor we should look at refactoring this together with the
    // for-of initializer transformation.
    let iterationVariable: lua.Identifier;
    if (ts.isVariableDeclarationList(statement.initializer)) {
        const binding = getVariableDeclarationBinding(context, statement.initializer);
        if (!ts.isIdentifier(binding)) {
            // TODO:
            throw new Error(`Unsupported for...in variable kind: ${ts.SyntaxKind[binding.kind]}.`);
        }

        iterationVariable = transformIdentifier(context, binding);
    } else if (ts.isIdentifier(statement.initializer)) {
        // Iteration variable becomes ____key
        iterationVariable = lua.createIdentifier("____key");
        // Push variable = ____key to the start of the loop body to match TS scoping
        const assignment = transformAssignment(
            context,
            statement.initializer,
            iterationVariable,
            statement.initializer
        );

        body.statements.unshift(...assignment);
    } else {
        // TODO:
        throw new Error(`Unsupported for...in variable kind: ${ts.SyntaxKind[statement.initializer.kind]}.`);
    }

    return lua.createForInStatement(body, [iterationVariable], [pairsCall], statement);
};
