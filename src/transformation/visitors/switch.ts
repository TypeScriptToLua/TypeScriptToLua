import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";

const containsBreakStatement = (statements: ts.Node[]): boolean => {
    for (const s of statements) {
        if (
            ts.isSwitchStatement(s) ||
            ts.isWhileStatement(s) ||
            ts.isDoStatement(s) ||
            ts.isForStatement(s) ||
            ts.isForInStatement(s) ||
            ts.isForOfStatement(s)
        ) {
            // Ignore: Break statements are valid as children of these
            //         statements without breaking the clause
        } else if (ts.isBreakStatement(s)) {
            return true;
        } else if (containsBreakStatement(s.getChildren())) {
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

    // Collect the fallthrough bodies for each case as defined by the switch.
    const caseBody: lua.Statement[][] = [];
    for (let i = 0; i < statement.caseBlock.clauses.length; i++) {
        const end = statement.caseBlock.clauses
            .slice(i)
            .findIndex(clause => containsBreakStatement([...clause.statements]));
        caseBody[i] = statement.caseBlock.clauses
            .slice(i, end >= 0 ? end + i + 1 : undefined)
            .reduce<lua.Statement[]>(
                (statements, clause) => [
                    ...statements,
                    lua.createDoStatement(context.transformStatements(clause.statements)),
                ],
                []
            );
    }

    // Starting from the back, concatenating ifs into one big if/elseif statement
    const defaultIndex = statement.caseBlock.clauses.findIndex(c => ts.isDefaultClause(c));
    const concatenatedIf = statement.caseBlock.clauses.reduceRight<lua.IfStatement | lua.Block | undefined>(
        (previousCondition, clause, index) => {
            if (ts.isDefaultClause(clause)) {
                // Skip default clause here (needs to be included to ensure index lines up with index later)
                return previousCondition;
            }

            // If the clause condition holds, go to the correct label
            const condition = lua.createBinaryExpression(
                switchVariable,
                context.transformExpression(clause.expression),
                lua.SyntaxKind.EqualityOperator
            );

            return lua.createIfStatement(condition, lua.createBlock(caseBody[index]), previousCondition);
        },
        defaultIndex >= 0 ? lua.createBlock(caseBody[defaultIndex]) : undefined
    );

    let statements: lua.Statement[] = [];

    if (concatenatedIf) {
        statements.push(concatenatedIf as unknown as lua.IfStatement);
    }

    statements = performHoisting(context, statements);
    popScope(context);

    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    return statements;
};
