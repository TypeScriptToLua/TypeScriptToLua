import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { performHoisting, ScopeType } from "../utils/scope";
import { transformBlockOrStatement } from "./block";
import { canBeFalsy } from "../utils/typescript";

type EvaluatedExpression = [precedingStatemens: lua.Statement[], value: lua.Expression];

function transformProtectedConditionalExpression(
    context: TransformationContext,
    expression: ts.ConditionalExpression,
    condition: EvaluatedExpression,
    whenTrue: EvaluatedExpression,
    whenFalse: EvaluatedExpression
): lua.Expression {
    const tempVar = context.createTempNameForNode(expression.condition);

    const trueStatements = whenTrue[0].concat(
        lua.createAssignmentStatement(lua.cloneIdentifier(tempVar), whenTrue[1], expression.whenTrue)
    );

    const falseStatements = whenFalse[0].concat(
        lua.createAssignmentStatement(lua.cloneIdentifier(tempVar), whenFalse[1], expression.whenFalse)
    );

    context.addPrecedingStatements([
        lua.createVariableDeclarationStatement(tempVar, undefined, expression.condition),
        ...condition[0],
        lua.createIfStatement(
            condition[1],
            lua.createBlock(trueStatements, expression.whenTrue),
            lua.createBlock(falseStatements, expression.whenFalse),
            expression
        ),
    ]);
    return lua.cloneIdentifier(tempVar);
}

export const transformConditionalExpression: FunctionVisitor<ts.ConditionalExpression> = (expression, context) => {
    const condition = transformInPrecedingStatementScope(context, () =>
        context.transformExpression(expression.condition)
    );
    const whenTrue = transformInPrecedingStatementScope(context, () =>
        context.transformExpression(expression.whenTrue)
    );
    const whenFalse = transformInPrecedingStatementScope(context, () =>
        context.transformExpression(expression.whenFalse)
    );
    if (
        whenTrue[0].length > 0 ||
        whenFalse[0].length > 0 ||
        canBeFalsy(context, context.checker.getTypeAtLocation(expression.whenTrue))
    ) {
        return transformProtectedConditionalExpression(context, expression, condition, whenTrue, whenFalse);
    }

    // condition and v1 or v2
    context.addPrecedingStatements(condition[0]);
    const conditionAnd = lua.createBinaryExpression(condition[1], whenTrue[1], lua.SyntaxKind.AndOperator);
    return lua.createBinaryExpression(conditionAnd, whenFalse[1], lua.SyntaxKind.OrOperator, expression);
};

export function transformIfStatement(statement: ts.IfStatement, context: TransformationContext): lua.IfStatement {
    context.pushScope(ScopeType.Conditional);
    const condition = context.transformExpression(statement.expression);
    const statements = performHoisting(context, transformBlockOrStatement(context, statement.thenStatement));
    context.popScope();
    const ifBlock = lua.createBlock(statements);

    if (statement.elseStatement) {
        if (ts.isIfStatement(statement.elseStatement)) {
            const tsElseStatement = statement.elseStatement;
            const [precedingStatements, elseStatement] = transformInPrecedingStatementScope(context, () =>
                transformIfStatement(tsElseStatement, context)
            );
            // If else-if condition generates preceding statements, we can't use elseif, we have to break it down:
            // if conditionA then
            //     ...
            // else
            //     conditionB's preceding statements
            //     if conditionB then
            //     end
            // end
            if (precedingStatements.length > 0) {
                const elseBlock = lua.createBlock([...precedingStatements, elseStatement]);
                return lua.createIfStatement(condition, ifBlock, elseBlock);
            } else {
                return lua.createIfStatement(condition, ifBlock, elseStatement);
            }
        } else {
            context.pushScope(ScopeType.Conditional);
            const elseStatements = performHoisting(
                context,
                transformBlockOrStatement(context, statement.elseStatement)
            );
            context.popScope();
            const elseBlock = lua.createBlock(elseStatements);
            return lua.createIfStatement(condition, ifBlock, elseBlock);
        }
    }

    return lua.createIfStatement(condition, ifBlock);
}
