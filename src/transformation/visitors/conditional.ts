import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { transformBlockOrStatement } from "./block";
import { canBeFalsy } from "../utils/typescript";
import { truthyOnlyConditionalValue } from "../utils/diagnostics";

function transformProtectedConditionalExpression(
    context: TransformationContext,
    expression: ts.ConditionalExpression
): lua.Expression {
    const tempVar = context.createTempNameForNode(expression.condition);

    const condition = context.transformExpression(expression.condition);

    const [trueStatements, val1] = transformInPrecedingStatementScope(context, () =>
        context.transformExpression(expression.whenTrue)
    );
    trueStatements.push(lua.createAssignmentStatement(lua.cloneIdentifier(tempVar), val1, expression.whenTrue));

    const [falseStatements, val2] = transformInPrecedingStatementScope(context, () =>
        context.transformExpression(expression.whenFalse)
    );
    falseStatements.push(lua.createAssignmentStatement(lua.cloneIdentifier(tempVar), val2, expression.whenFalse));

    context.addPrecedingStatements([
        lua.createVariableDeclarationStatement(tempVar, undefined, expression.condition),
        lua.createIfStatement(
            condition,
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

    if (canBeFalsy(context, context.checker.getTypeAtLocation(expression.whenTrue))) {
        return transformProtectedConditionalExpression(context, expression);
    }

    const condition = context.transformExpression(expression.condition);
    const val1 = context.transformExpression(expression.whenTrue);
    const val2 = context.transformExpression(expression.whenFalse);

    // condition and v1 or v2
    const conditionAnd = lua.createBinaryExpression(condition, val1, lua.SyntaxKind.AndOperator);
    return lua.createBinaryExpression(conditionAnd, val2, lua.SyntaxKind.OrOperator, expression);
};

export function transformIfStatement(statement: ts.IfStatement, context: TransformationContext): lua.IfStatement {
    // Check if we need to add diagnostic about Lua truthiness
    checkOnlyTruthyCondition(statement.expression, context);

    pushScope(context, ScopeType.Conditional);
    const condition = context.transformExpression(statement.expression);
    const statements = performHoisting(context, transformBlockOrStatement(context, statement.thenStatement));
    popScope(context);
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
            pushScope(context, ScopeType.Conditional);
            const elseStatements = performHoisting(
                context,
                transformBlockOrStatement(context, statement.elseStatement)
            );
            popScope(context);
            const elseBlock = lua.createBlock(elseStatements);
            return lua.createIfStatement(condition, ifBlock, elseBlock);
        }
    }

    return lua.createIfStatement(condition, ifBlock);
}

export function checkOnlyTruthyCondition(condition: ts.Expression, context: TransformationContext) {
    if (!canBeFalsy(context, context.checker.getTypeAtLocation(condition))) {
        context.diagnostics.push(truthyOnlyConditionalValue(condition));
    }
}
