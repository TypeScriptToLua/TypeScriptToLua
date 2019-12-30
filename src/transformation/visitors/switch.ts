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

    const expression = context.transformExpression(statement.expression);
    const switchVariable = lua.createIdentifier(switchName);
    const switchVariableDeclaration = lua.createVariableDeclarationStatement(switchVariable, expression);

    let statements: lua.Statement[] = [switchVariableDeclaration];

    const caseClauses = statement.caseBlock.clauses.filter(ts.isCaseClause);
    for (const [index, clause] of caseClauses.entries()) {
        // If the clause condition holds, go to the correct label
        const condition = lua.createBinaryExpression(
            switchVariable,
            context.transformExpression(clause.expression),
            lua.SyntaxKind.EqualityOperator
        );

        const goto = lua.createGotoStatement(`${switchName}_case_${index}`);
        const conditionalGoto = lua.createIfStatement(condition, lua.createBlock([goto]));
        statements.push(conditionalGoto);
    }

    const hasDefaultCase = statement.caseBlock.clauses.some(ts.isDefaultClause);
    if (hasDefaultCase) {
        statements.push(lua.createGotoStatement(`${switchName}_case_default`));
    } else {
        statements.push(lua.createGotoStatement(`${switchName}_end`));
    }

    for (const [index, clause] of statement.caseBlock.clauses.entries()) {
        const label = ts.isCaseClause(clause)
            ? lua.createLabelStatement(`${switchName}_case_${index}`)
            : lua.createLabelStatement(`${switchName}_case_default`);

        const body = lua.createDoStatement(context.transformStatements(clause.statements));
        statements.push(label, body);
    }

    statements.push(lua.createLabelStatement(`${switchName}_end`));

    statements = performHoisting(context, statements);
    popScope(context);

    return statements;
};
