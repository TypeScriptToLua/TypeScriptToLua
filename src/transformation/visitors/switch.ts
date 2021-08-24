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

    // Give the switch and condition accumulator a unique name to prevent nested switches from acting up.
    const switchName = `____switch${scope.id}`;
    const conditionName = `____cond${scope.id}`;
    const switchVariable = lua.createIdentifier(switchName);
    const conditionVariable = lua.createIdentifier(conditionName);

    // Collect all the expressions into a single expression for use in the default clause
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

    // If the switch only has a default clause, wrap it in a single do.
    // Otherwise, we need to generate a set of if statements to emulate the switch.
    const clauses = statement.caseBlock.clauses;
    if (clauses.length === 1 && ts.isDefaultClause(clauses[0])) {
        const defaultClause = clauses[0].statements;
        if (defaultClause.length) {
            statements.push(lua.createDoStatement(context.transformStatements(defaultClause)));
        }
    } else {
        // Build up the condition for each if statement
        // Fallthrough is handled by accepting the last condition as an additional or clause
        // Default is the not of all known case expressions
        let previousClause: ts.CaseOrDefaultClause;
        let condition: lua.Expression | undefined;
        let isInitialCondition = true;
        statement.caseBlock.clauses.forEach(clause => {
            if (!condition || (previousClause && containsBreakOrReturn([...previousClause.statements]))) {
                if (ts.isDefaultClause(clause)) {
                    condition = undefined;
                } else {
                    condition = lua.createBinaryExpression(
                        switchVariable,
                        context.transformExpression(clause.expression),
                        lua.SyntaxKind.EqualityOperator
                    );
                }
            } else if (!ts.isDefaultClause(clause)) {
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

            if (clause.statements.length) {
                if (!ts.isDefaultClause(clause) && condition) {
                    statements.push(
                        isInitialCondition
                            ? lua.createVariableDeclarationStatement(conditionVariable, condition)
                            : lua.createAssignmentStatement(
                                  conditionVariable,
                                  lua.createBinaryExpression(conditionVariable, condition, lua.SyntaxKind.OrOperator)
                              )
                    );
                    isInitialCondition = false;
                    condition = undefined;
                }

                if (
                    !(
                        ts.isDefaultClause(clause) &&
                        previousClause &&
                        containsBreakOrReturn([...previousClause.statements])
                    )
                ) {
                    statements.push(
                        lua.createIfStatement(
                            conditionVariable,
                            lua.createBlock(context.transformStatements(clause.statements))
                        )
                    );
                }
            }

            previousClause = clause;
        });

        // Amalgamate the default w/ fallthrough clauses and execute if nothing else executed above
        const start = clauses.findIndex(c => ts.isDefaultClause(c));
        if (start >= 0) {
            const end = statement.caseBlock.clauses
                .slice(start)
                .findIndex(clause => containsBreakOrReturn([...clause.statements]));
            const defaultStatements = statement.caseBlock.clauses
                .slice(start, end >= 0 ? end + start + 1 : undefined)
                .reduce<lua.Statement[]>(
                    (statements, clause) => [...statements, ...context.transformStatements(clause.statements)],
                    []
                );

            if (defaultStatements.length) {
                statements.push(
                    lua.createIfStatement(
                        lua.createUnaryExpression(conditionVariable, lua.SyntaxKind.NotOperator),
                        lua.createBlock(defaultStatements)
                    )
                );
            }
        }
    }

    // Hoist the variable, function, and import statements to the top of the switch
    statements = performHoisting(context, statements);
    popScope(context);

    // Add the switch expression after hoisting
    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    // Wrap the statements in a repeat until true statement to facilitate dynamic break/returns
    return lua.createRepeatStatement(lua.createBlock(statements), lua.createBooleanLiteral(true));
};
