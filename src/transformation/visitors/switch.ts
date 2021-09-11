import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { popScope, pushScope, ScopeType, separateHoistedStatements } from "../utils/scope";

const containsBreakOrReturn = (nodes: Iterable<ts.Node>): boolean => {
    for (const s of nodes) {
        if (ts.isBreakStatement(s) || ts.isReturnStatement(s)) {
            return true;
        } else if (ts.isBlock(s) && containsBreakOrReturn(s.getChildren())) {
            return true;
        } else if (s.kind === ts.SyntaxKind.SyntaxList && containsBreakOrReturn(s.getChildren())) {
            return true;
        }
    }

    return false;
};

const coalesceCondition = (
    condition: lua.Expression | undefined,
    switchVariable: lua.Identifier,
    expression: ts.Expression,
    context: TransformationContext
): lua.Expression => {
    // Coalesce skipped statements
    if (condition) {
        return lua.createBinaryExpression(
            condition,
            lua.createBinaryExpression(
                switchVariable,
                context.transformExpression(expression),
                lua.SyntaxKind.EqualityOperator
            ),
            lua.SyntaxKind.OrOperator
        );
    }

    // Next condition
    return lua.createBinaryExpression(
        switchVariable,
        context.transformExpression(expression),
        lua.SyntaxKind.EqualityOperator
    );
};

export const transformSwitchStatement: FunctionVisitor<ts.SwitchStatement> = (statement, context) => {
    const scope = pushScope(context, ScopeType.Switch);

    // Give the switch and condition accumulator a unique name to prevent nested switches from acting up.
    const switchName = `____switch${scope.id}`;
    const conditionName = `____cond${scope.id}`;
    const switchVariable = lua.createIdentifier(switchName);
    const conditionVariable = lua.createIdentifier(conditionName);

    // If the switch only has a default clause, wrap it in a single do.
    // Otherwise, we need to generate a set of if statements to emulate the switch.
    const statements: lua.Statement[] = [];
    const hoistedStatements: lua.Statement[] = [];
    const hoistedIdentifiers: lua.Identifier[] = [];
    const clauses = statement.caseBlock.clauses;
    if (clauses.length === 1 && ts.isDefaultClause(clauses[0])) {
        const defaultClause = clauses[0].statements;
        if (defaultClause.length) {
            const {
                statements: defaultStatements,
                hoistedStatements: defaultHoistedStatements,
                hoistedIdentifiers: defaultHoistedIdentifiers,
            } = separateHoistedStatements(context, context.transformStatements(defaultClause));
            hoistedStatements.push(...defaultHoistedStatements);
            hoistedIdentifiers.push(...defaultHoistedIdentifiers);
            statements.push(lua.createDoStatement(defaultStatements));
        }
    } else {
        // Build up the condition for each if statement
        let defaultTransformed = false;
        let isInitialCondition = true;
        let condition: lua.Expression | undefined = undefined;
        for (let i = 0; i < clauses.length; i++) {
            const clause = clauses[i];
            const previousClause: ts.CaseOrDefaultClause | undefined = clauses[i - 1];

            // Skip redundant default clauses, will be handled in final default case
            if (i === 0 && ts.isDefaultClause(clause)) continue;
            if (ts.isDefaultClause(clause) && previousClause && containsBreakOrReturn(previousClause.statements)) {
                continue;
            }

            // Compute the condition for the if statement
            if (!ts.isDefaultClause(clause)) {
                condition = coalesceCondition(condition, switchVariable, clause.expression, context);

                // Skip empty clauses unless final clause (i.e side-effects)
                if (i !== clauses.length - 1 && clause.statements.length === 0) continue;

                // Declare or assign condition variable
                statements.push(
                    isInitialCondition
                        ? lua.createVariableDeclarationStatement(conditionVariable, condition)
                        : lua.createAssignmentStatement(
                              conditionVariable,
                              lua.createBinaryExpression(conditionVariable, condition, lua.SyntaxKind.OrOperator)
                          )
                );
                isInitialCondition = false;
            } else {
                // If the default is proceeded by empty clauses and will be emitted we may need to initialize the condition
                if (isInitialCondition) {
                    statements.push(
                        lua.createVariableDeclarationStatement(
                            conditionVariable,
                            condition ?? lua.createBooleanLiteral(false)
                        )
                    );

                    // Clear condition ot ensure it is not evaluated twice
                    condition = undefined;
                    isInitialCondition = false;
                }

                // Allow default to fallthrough to final default clause
                if (i === clauses.length - 1) {
                    // Evaluate the final condition that we may be skipping
                    if (condition) {
                        statements.push(
                            lua.createAssignmentStatement(
                                conditionVariable,
                                lua.createBinaryExpression(conditionVariable, condition, lua.SyntaxKind.OrOperator)
                            )
                        );
                    }
                    continue;
                }
            }

            // Transform the clause and append the final break statement if necessary
            const {
                statements: clauseStatements,
                hoistedStatements: clauseHoistedStatements,
                hoistedIdentifiers: clauseHoistedIdentifiers,
            } = separateHoistedStatements(context, context.transformStatements(clause.statements));
            if (i === clauses.length - 1 && !containsBreakOrReturn(clause.statements)) {
                clauseStatements.push(lua.createBreakStatement());
            }
            hoistedStatements.push(...clauseHoistedStatements);
            hoistedIdentifiers.push(...clauseHoistedIdentifiers);

            // Remember that we transformed default clause so we don't duplicate hoisted statements later
            if (ts.isDefaultClause(clause)) {
                defaultTransformed = true;
            }

            // Push if statement for case
            statements.push(lua.createIfStatement(conditionVariable, lua.createBlock(clauseStatements)));

            // Clear condition for next clause
            condition = undefined;
        }

        // If no conditions above match, we need to create the final default case code-path,
        // as we only handle fallthrough into defaults in the previous if statement chain
        const start = clauses.findIndex(c => ts.isDefaultClause(c));
        if (start >= 0) {
            // Find the last clause that we can fallthrough to
            const end = clauses.findIndex(
                (clause, index) => index >= start && containsBreakOrReturn(clause.statements)
            );

            const {
                statements: defaultStatements,
                hoistedStatements: defaultHoistedStatements,
                hoistedIdentifiers: defaultHoistedIdentifiers,
            } = separateHoistedStatements(context, context.transformStatements(clauses[start].statements));

            // Only push hoisted statements if this is the first time we're transforming the default clause
            if (!defaultTransformed) {
                hoistedStatements.push(...defaultHoistedStatements);
                hoistedIdentifiers.push(...defaultHoistedIdentifiers);
            }

            // Combine the fallthrough statements
            for (const clause of clauses.slice(start + 1, end >= 0 ? end + 1 : undefined)) {
                let statements = context.transformStatements(clause.statements);
                // Drop hoisted statements as they were already added when clauses were initially transformed above
                ({ statements } = separateHoistedStatements(context, statements));
                defaultStatements.push(...statements);
            }

            // Add the default clause if it has any statements
            // The switch will always break on the final clause and skip execution if valid to do so
            if (defaultStatements.length) {
                statements.push(lua.createDoStatement(defaultStatements));
            }
        }
    }

    // Hoist the variable, function, and import statements to the top of the switch
    statements.unshift(...hoistedStatements);
    if (hoistedIdentifiers.length > 0) {
        statements.unshift(lua.createVariableDeclarationStatement(hoistedIdentifiers));
    }

    popScope(context);

    // Add the switch expression after hoisting
    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    // Wrap the statements in a repeat until true statement to facilitate dynamic break/returns
    return lua.createRepeatStatement(lua.createBlock(statements), lua.createBooleanLiteral(true));
};
