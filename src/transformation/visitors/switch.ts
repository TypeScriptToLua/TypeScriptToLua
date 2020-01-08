import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { UnsupportedForTarget } from "../utils/errors";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";

export const transformSwitchStatement: FunctionVisitor<ts.SwitchStatement> = (statement, context) => {
    if (context.luaTarget === LuaTarget.Lua51) {
        throw UnsupportedForTarget("Switch statements", LuaTarget.Lua51, statement);
    }

    const scope = pushScope(context, ScopeType.Switch);

    // Give the switch a unique name to prevent nested switches from acting up.
    const switchName = `____switch${scope.id}`;
    const switchVariable = lua.createIdentifier(switchName);

    let statements: lua.Statement[] = [];

    const caseClauses = statement.caseBlock.clauses.filter(ts.isCaseClause);
    const resultIfStatements: lua.IfStatement[] = [];

    for (const [index, clause] of caseClauses.entries()) {
        // If the clause condition holds, go to the correct label
        const condition = lua.createBinaryExpression(
            switchVariable,
            context.transformExpression(clause.expression),
            lua.SyntaxKind.EqualityOperator
        );

        const goto = lua.createGotoStatement(`${switchName}_case_${index}`);
        const conditionalGoto = lua.createIfStatement(condition, lua.createBlock([goto]));

        resultIfStatements.push(conditionalGoto);
    }

    if (resultIfStatements.length > 0) {
        for (let index = 1; index < resultIfStatements.length; index++) {
            const previousIf = resultIfStatements[index - 1];

            previousIf.elseBlock = resultIfStatements[index];
        }

        const firstIf = resultIfStatements[0];

        statements.push(firstIf);
    }

    const hasDefaultCase = statement.caseBlock.clauses.some(ts.isDefaultClause);
    statements.push(lua.createGotoStatement(`${switchName}_${hasDefaultCase ? "case_default" : "end"}`));

    for (const [index, clause] of statement.caseBlock.clauses.entries()) {
        const labelName = `${switchName}_case_${ts.isCaseClause(clause) ? index : "default"}`;
        statements.push(lua.createLabelStatement(labelName));
        statements.push(lua.createDoStatement(context.transformStatements(clause.statements)));
    }

    statements.push(lua.createLabelStatement(`${switchName}_end`));

    statements = performHoisting(context, statements);
    popScope(context);

    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    return statements;
};
