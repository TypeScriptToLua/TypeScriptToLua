import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { transformBlockOrStatement } from "./block";

function canBeFalsy(context: TransformationContext, type: ts.Type): boolean {
    const strictNullChecks = context.options.strict === true || context.options.strictNullChecks === true;

    const falsyFlags =
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Null |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Any;

    if (type.flags & falsyFlags) {
        return true;
    } else if (!strictNullChecks && !type.isLiteral()) {
        return true;
    } else if (type.isUnion()) {
        return type.types.some(subType => canBeFalsy(context, subType));
    } else {
        return false;
    }
}

function wrapInFunctionCall(expression: lua.Expression): lua.FunctionExpression {
    const returnStatement = lua.createReturnStatement([expression]);

    return lua.createFunctionExpression(
        lua.createBlock([returnStatement]),
        undefined,
        undefined,
        undefined,
        lua.FunctionExpressionFlags.Inline
    );
}

function transformProtectedConditionalExpression(
    context: TransformationContext,
    expression: ts.ConditionalExpression
): lua.CallExpression {
    const condition = lua.createParenthesizedExpression(context.transformExpression(expression.condition));
    const val1 = context.transformExpression(expression.whenTrue);
    const val2 = context.transformExpression(expression.whenFalse);

    const val1Function = wrapInFunctionCall(val1);
    const val2Function = wrapInFunctionCall(val2);

    // (condition and (() => v1) or (() => v2))()
    const conditionAnd = lua.createBinaryExpression(condition, val1Function, lua.SyntaxKind.AndOperator);
    const orExpression = lua.createBinaryExpression(conditionAnd, val2Function, lua.SyntaxKind.OrOperator);
    return lua.createCallExpression(lua.createParenthesizedExpression(orExpression), [], expression);
}

export const transformConditionalExpression: FunctionVisitor<ts.ConditionalExpression> = (expression, context) => {
    if (canBeFalsy(context, context.checker.getTypeAtLocation(expression.whenTrue))) {
        return transformProtectedConditionalExpression(context, expression);
    }

    const condition = lua.createParenthesizedExpression(context.transformExpression(expression.condition));
    const val1 = context.transformExpression(expression.whenTrue);
    const val2 = context.transformExpression(expression.whenFalse);

    // condition and v1 or v2
    const conditionAnd = lua.createBinaryExpression(condition, val1, lua.SyntaxKind.AndOperator);
    return lua.createBinaryExpression(conditionAnd, val2, lua.SyntaxKind.OrOperator, expression);
};

export function transformIfStatement(statement: ts.IfStatement, context: TransformationContext): lua.IfStatement {
    pushScope(context, ScopeType.Conditional);
    const condition = context.transformExpression(statement.expression);
    const statements = performHoisting(context, transformBlockOrStatement(context, statement.thenStatement));
    popScope(context);
    const ifBlock = lua.createBlock(statements);

    if (statement.elseStatement) {
        if (ts.isIfStatement(statement.elseStatement)) {
            const elseStatement = transformIfStatement(statement.elseStatement, context);
            return lua.createIfStatement(condition, ifBlock, elseStatement);
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
