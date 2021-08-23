import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";

const containsBreakOrReturn = (statements: ts.Node[]): boolean => {
    for (const s of statements) {
        if (ts.isBreakStatement(s) || ts.isReturnStatement(s)) {
            return true;
        } else if (!ts.isBlock(s)) {
            // Can only ensure a break scoped in a block is deterministic
            continue;
        } else if (containsBreakOrReturn(s.getChildren())) {
            return true;
        }
    }

    return false;
};

export const transformSwitchStatement: FunctionVisitor<ts.SwitchStatement> = (statement, context) => {
    const scope = pushScope(context, ScopeType.Switch);

    // Give the switch a unique name to prevent nested switches from acting up.
    const switchName = `____switch${scope.id}`;
    const switchVariable = lua.createIdentifier(switchName);

    // Collect the case clause expressions and accounting for deterministic fallthrough
    let allExpressions: lua.BinaryExpression;
    statement.caseBlock.clauses.forEach(clause => {
        if (!ts.isDefaultClause(clause)) {
            allExpressions = allExpressions
                ? lua.createBinaryExpression(
                      allExpressions,
                      lua.createBinaryExpression(
                          switchVariable,
                          context.transformExpression(clause.expression),
                          lua.SyntaxKind.EqualityOperator
                      ),
                      lua.SyntaxKind.OrOperator
                  )
                : lua.createBinaryExpression(
                      switchVariable,
                      context.transformExpression(clause.expression),
                      lua.SyntaxKind.EqualityOperator
                  );
        }
    });

    let statements: lua.Statement[] = [];

    // Default will either be the only statement, or the else in the if chain
    const defaultIndex = statement.caseBlock.clauses.findIndex(c => ts.isDefaultClause(c));
    const defaultBody = defaultIndex >= 0 ? statement.caseBlock.clauses[defaultIndex].statements : undefined;
    if (defaultBody && statement.caseBlock.clauses.length === 1) {
        statements.push(lua.createDoStatement(context.transformStatements(defaultBody)));
    } else {
        let previousClause: ts.CaseOrDefaultClause;
        let condition: lua.Expression;
        statement.caseBlock.clauses.forEach(clause => {
            if (!condition || (previousClause && containsBreakOrReturn([...previousClause.statements]))) {
                if (ts.isDefaultClause(clause)) {
                    condition = lua.createUnaryExpression(allExpressions, lua.SyntaxKind.NotOperator);
                } else {
                    condition = lua.createBinaryExpression(
                        switchVariable,
                        context.transformExpression(clause.expression),
                        lua.SyntaxKind.EqualityOperator
                    );
                }
            } else {
                if (ts.isDefaultClause(clause)) {
                    condition = lua.createBinaryExpression(
                        condition,
                        lua.createUnaryExpression(allExpressions, lua.SyntaxKind.NotOperator),
                        lua.SyntaxKind.OrOperator
                    );
                } else {
                    condition = lua.createBinaryExpression(
                        condition,
                        lua.createBinaryExpression(
                            switchVariable,
                            context.transformExpression(clause.expression),
                            lua.SyntaxKind.EqualityOperator
                        ),
                        lua.SyntaxKind.OrOperator
                    );
                }
            }

            if (condition && clause.statements.length) {
                statements.push(
                    lua.createIfStatement(condition, lua.createBlock(context.transformStatements(clause.statements)))
                );
            }

            previousClause = clause;
        });
    }

    statements = performHoisting(context, statements);
    popScope(context);

    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    return lua.createRepeatStatement(lua.createBlock(statements), lua.createBooleanLiteral(true));
};
