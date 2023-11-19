import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { transformInPrecedingStatementScope, WithPrecedingStatements } from "../utils/preceding-statements";
import { performHoisting, ScopeType } from "../utils/scope";
import { transformBlockOrStatement } from "./block";
import { canBeFalsy } from "../utils/typescript";
import { truthyOnlyConditionalValue } from "../utils/diagnostics";

function transformProtectedConditionalExpression(
    context: TransformationContext,
    expression: ts.ConditionalExpression,
    condition: WithPrecedingStatements<lua.Expression>,
    whenTrue: WithPrecedingStatements<lua.Expression>,
    whenFalse: WithPrecedingStatements<lua.Expression>
): lua.Expression {
    const tempVar = context.createTempNameForNode(expression.condition);

    const trueStatements = whenTrue.precedingStatements.concat(
        lua.createAssignmentStatement(lua.cloneIdentifier(tempVar), whenTrue.result, expression.whenTrue)
    );

    const falseStatements = whenFalse.precedingStatements.concat(
        lua.createAssignmentStatement(lua.cloneIdentifier(tempVar), whenFalse.result, expression.whenFalse)
    );

    context.addPrecedingStatements([
        lua.createVariableDeclarationStatement(tempVar, undefined, expression.condition),
        ...condition.precedingStatements,
        lua.createIfStatement(
            condition.result,
            lua.createBlock(trueStatements, expression.whenTrue),
            lua.createBlock(falseStatements, expression.whenFalse),
            expression
        ),
    ]);
    return lua.cloneIdentifier(tempVar);
}

export const transformConditionalExpression: FunctionVisitor<ts.ConditionalExpression> = (expression, context) => {
    // Check if we need to add diagnostic about Lua truthiness
    checkOnlyTruthyCondition(expression.condition, context);

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
        whenTrue.precedingStatements.length > 0 ||
        whenFalse.precedingStatements.length > 0 ||
        canBeFalsy(context, context.checker.getTypeAtLocation(expression.whenTrue))
    ) {
        return transformProtectedConditionalExpression(context, expression, condition, whenTrue, whenFalse);
    }

    // condition and v1 or v2
    context.addPrecedingStatements(condition.precedingStatements);
    const conditionAnd = lua.createBinaryExpression(condition.result, whenTrue.result, lua.SyntaxKind.AndOperator);
    return lua.createBinaryExpression(conditionAnd, whenFalse.result, lua.SyntaxKind.OrOperator, expression);
};

export function transformIfStatement(statement: ts.IfStatement, context: TransformationContext): lua.IfStatement {
    context.pushScope(ScopeType.Conditional);

    // Check if we need to add diagnostic about Lua truthiness
    checkOnlyTruthyCondition(statement.expression, context);

    const condition = context.transformExpression(statement.expression);
    const statements = performHoisting(context, transformBlockOrStatement(context, statement.thenStatement));
    context.popScope();
    const ifBlock = lua.createBlock(statements);

    if (statement.elseStatement) {
        if (ts.isIfStatement(statement.elseStatement)) {
            const tsElseStatement = statement.elseStatement;
            const { precedingStatements, result: elseStatement } = transformInPrecedingStatementScope(context, () =>
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

export function checkOnlyTruthyCondition(condition: ts.Expression, context: TransformationContext) {
    if (context.options.strictNullChecks === false) return; // This check is not valid if everything could implicitly be nil
    if (ts.isElementAccessExpression(condition)) return; // Array index could always implicitly return nil

    if (!canBeFalsy(context, context.checker.getTypeAtLocation(condition))) {
        context.diagnostics.push(truthyOnlyConditionalValue(condition));
    }
}
