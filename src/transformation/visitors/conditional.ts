import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { transformBlockOrStatement } from "./block";

export const transformConditionalExpression: FunctionVisitor<ts.ConditionalExpression> = (expression, context) => {
    // local ____conditional;
    const tempVariable = context.createUniqueIdentifier("ternary_conditional");
    const tempVariableDeclaration = lua.createVariableDeclarationStatement(tempVariable);

    const createTempVariableAssignment = (value: lua.Expression) =>
        lua.createBlock([
            ...context.popPrecedingStatements(),
            lua.createAssignmentStatement(lua.cloneIdentifier(tempVariable), value),
        ]);

    // if expression.condition
    const ifStatement = lua.createIfStatement(
        context.transformExpression(expression.condition),
        // then ____conditional = expression.whenTrue
        createTempVariableAssignment(context.transformExpression(expression.whenTrue)),
        // else ____conditional = expression.whenFalse
        createTempVariableAssignment(context.transformExpression(expression.whenFalse))
    );

    // Use temp variable declaration and if statement as preceding statements
    context.pushPrecedingStatement(tempVariableDeclaration, ifStatement);

    // ____conditional
    return lua.cloneIdentifier(tempVariable);
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
