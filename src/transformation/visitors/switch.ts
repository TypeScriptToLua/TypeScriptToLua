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

    // Hoist the variable, function, and import statements to the top of the switch
    statements = performHoisting(context, statements);
    popScope(context);

    // Add the switch expression after hoisting
    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    // Wrap the statements in a repeat until true statement to facilitate dynamic break/returns
    return lua.createRepeatStatement(lua.createBlock(statements), lua.createBooleanLiteral(true));
};
