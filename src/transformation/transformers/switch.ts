import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as tstl from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { UnsupportedForTarget } from "../utils/errors";
import { peekScope, performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";

export const transformSwitchStatement: FunctionVisitor<ts.SwitchStatement> = (statement, context) => {
    if (context.luaTarget === LuaTarget.Lua51) {
        throw UnsupportedForTarget("Switch statements", LuaTarget.Lua51, statement);
    }

    pushScope(context, ScopeType.Switch);

    // Give the switch a unique name to prevent nested switches from acting up.
    const scope = peekScope(context);
    const switchName = `____switch${scope.id}`;

    const expression = context.transformExpression(statement.expression);
    const switchVariable = tstl.createIdentifier(switchName);
    const switchVariableDeclaration = tstl.createVariableDeclarationStatement(switchVariable, expression);

    let statements: tstl.Statement[] = [switchVariableDeclaration];

    const caseClauses = statement.caseBlock.clauses.filter(ts.isCaseClause);
    for (const [index, clause] of caseClauses.entries()) {
        // If the clause condition holds, go to the correct label
        const condition = tstl.createBinaryExpression(
            switchVariable,
            context.transformExpression(clause.expression),
            tstl.SyntaxKind.EqualityOperator
        );

        const goto = tstl.createGotoStatement(`${switchName}_case_${index}`);
        const conditionalGoto = tstl.createIfStatement(condition, tstl.createBlock([goto]));
        statements.push(conditionalGoto);
    }

    const hasDefaultCase = statement.caseBlock.clauses.some(ts.isDefaultClause);
    if (hasDefaultCase) {
        statements.push(tstl.createGotoStatement(`${switchName}_case_default`));
    } else {
        statements.push(tstl.createGotoStatement(`${switchName}_end`));
    }

    for (const [index, clause] of statement.caseBlock.clauses.entries()) {
        const label = ts.isCaseClause(clause)
            ? tstl.createLabelStatement(`${switchName}_case_${index}`)
            : tstl.createLabelStatement(`${switchName}_case_default`);

        const body = tstl.createDoStatement(context.transformStatements(clause.statements));
        statements.push(label, body);
    }

    statements.push(tstl.createLabelStatement(`${switchName}_end`));

    statements = performHoisting(context, statements);
    popScope(context);

    return statements;
};
