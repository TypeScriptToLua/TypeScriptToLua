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

    let statements: lua.Statement[] = [];

    // Default will either be the only statement, or the else in the if chain
    const defaultIndex = statement.caseBlock.clauses.findIndex(c => ts.isDefaultClause(c));
    const defaultBody = defaultIndex >= 0 ? caseBody[defaultIndex] : undefined;
    if (defaultBody && statement.caseBlock.clauses.length === 1) {
        statements.push(lua.createDoStatement(defaultBody));
    } else {
        let concatenatedIf: lua.IfStatement | undefined = undefined;
        let previousCondition: lua.IfStatement | lua.Block | undefined = defaultBody
            ? lua.createBlock(defaultBody)
            : undefined;

        // Starting from the back, concatenating ifs into one big if/elseif/[else] statement
        for (let i = statement.caseBlock.clauses.length - 1; i >= 0; i--) {
            const clause = statement.caseBlock.clauses[i];

            // Skip default clause to keep index aligned, handle in else block
            if (ts.isDefaultClause(clause)) continue;

            // If the clause condition holds, go to the correct label
            const condition = lua.createBinaryExpression(
                switchVariable,
                context.transformExpression(clause.expression),
                lua.SyntaxKind.EqualityOperator
            );

            concatenatedIf = lua.createIfStatement(condition, lua.createBlock(caseBody[i]), previousCondition);
            previousCondition = concatenatedIf;
        }
        if (concatenatedIf) statements.push(concatenatedIf);
    }

    statements = performHoisting(context, statements);
    popScope(context);

    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    return statements;
};
