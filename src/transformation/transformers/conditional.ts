import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
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

function wrapInFunctionCall(expression: tstl.Expression): tstl.FunctionExpression {
    const returnStatement = tstl.createReturnStatement([expression]);

    return tstl.createFunctionExpression(
        tstl.createBlock([returnStatement]),
        undefined,
        undefined,
        undefined,
        tstl.FunctionExpressionFlags.Inline
    );
}

function transformProtectedConditionalExpression(
    context: TransformationContext,
    expression: ts.ConditionalExpression
): tstl.CallExpression {
    const condition = tstl.createParenthesizedExpression(context.transformExpression(expression.condition));
    const val1 = context.transformExpression(expression.whenTrue);
    const val2 = context.transformExpression(expression.whenFalse);

    const val1Function = wrapInFunctionCall(val1);
    const val2Function = wrapInFunctionCall(val2);

    // (condition and (() => v1) or (() => v2))()
    const conditionAnd = tstl.createBinaryExpression(condition, val1Function, tstl.SyntaxKind.AndOperator);
    const orExpression = tstl.createBinaryExpression(conditionAnd, val2Function, tstl.SyntaxKind.OrOperator);
    return tstl.createCallExpression(tstl.createParenthesizedExpression(orExpression), [], expression);
}

const transformConditionalExpression: FunctionVisitor<ts.ConditionalExpression> = (expression, context) => {
    if (canBeFalsy(context, context.checker.getTypeAtLocation(expression.whenTrue))) {
        return transformProtectedConditionalExpression(context, expression);
    }

    const condition = tstl.createParenthesizedExpression(context.transformExpression(expression.condition));
    const val1 = context.transformExpression(expression.whenTrue);
    const val2 = context.transformExpression(expression.whenFalse);

    // condition and v1 or v2
    const conditionAnd = tstl.createBinaryExpression(condition, val1, tstl.SyntaxKind.AndOperator);
    return tstl.createBinaryExpression(conditionAnd, val2, tstl.SyntaxKind.OrOperator, expression);
};

function transformIfStatement(statement: ts.IfStatement, context: TransformationContext): tstl.IfStatement {
    pushScope(context, ScopeType.Conditional);
    const condition = context.transformExpression(statement.expression);
    const statements = performHoisting(context, transformBlockOrStatement(context, statement.thenStatement));
    popScope(context);
    const ifBlock = tstl.createBlock(statements);

    if (statement.elseStatement) {
        if (ts.isIfStatement(statement.elseStatement)) {
            const elseStatement = transformIfStatement(statement.elseStatement, context);
            return tstl.createIfStatement(condition, ifBlock, elseStatement);
        } else {
            pushScope(context, ScopeType.Conditional);
            const elseStatements = performHoisting(
                context,
                transformBlockOrStatement(context, statement.elseStatement)
            );
            popScope(context);
            const elseBlock = tstl.createBlock(elseStatements);
            return tstl.createIfStatement(condition, ifBlock, elseBlock);
        }
    }

    return tstl.createIfStatement(condition, ifBlock);
}

export const conditionalPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.ConditionalExpression]: transformConditionalExpression,
        [ts.SyntaxKind.IfStatement]: transformIfStatement,
    },
};
