import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { transformInPrecedingStatementScope } from "../../utils/preceding-statements";
import { LoopContinued, performHoisting, ScopeType } from "../../utils/scope";
import { isAssignmentPattern } from "../../utils/typescript";
import { transformAssignment } from "../binary-expression/assignments";
import { transformAssignmentPattern } from "../binary-expression/destructuring-assignments";
import { transformBlockOrStatement } from "../block";
import { transformIdentifier } from "../identifier";
import { checkVariableDeclarationList, transformBindingPattern } from "../variable-declaration";

export function transformLoopBody(
    context: TransformationContext,
    loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement
): lua.Statement[] {
    context.pushScope(ScopeType.Loop);
    const body = performHoisting(context, transformBlockOrStatement(context, loop.statement));
    const scope = context.popScope();
    const scopeId = scope.id;

    switch (scope.loopContinued) {
        case undefined:
        case LoopContinued.WithContinue:
            return body;

        case LoopContinued.WithGoto:
            return [lua.createDoStatement(body), lua.createLabelStatement(`__continue${scopeId}`)];

        case LoopContinued.WithRepeatBreak:
            const identifier = lua.createIdentifier(`__continue${scopeId}`);
            const literalTrue = lua.createBooleanLiteral(true);

            // If there is a break in the body statements, do not include any code afterwards
            const transformedBodyStatements = [];
            let bodyBroken = false;
            for (const statement of body) {
                transformedBodyStatements.push(statement);
                if (lua.isBreakStatement(statement)) {
                    bodyBroken = true;
                    break;
                }
            }
            if (!bodyBroken) {
                // Tell loop to continue if not broken
                transformedBodyStatements.push(lua.createAssignmentStatement(identifier, literalTrue));
            }

            return [
                lua.createDoStatement([
                    lua.createVariableDeclarationStatement(identifier),
                    lua.createRepeatStatement(lua.createBlock(transformedBodyStatements), literalTrue),
                    lua.createIfStatement(
                        lua.createUnaryExpression(identifier, lua.SyntaxKind.NotOperator),
                        lua.createBlock([lua.createBreakStatement()])
                    ),
                ]),
            ];
    }
}

export function getVariableDeclarationBinding(
    context: TransformationContext,
    node: ts.VariableDeclarationList
): ts.BindingName {
    checkVariableDeclarationList(context, node);

    if (node.declarations.length === 0) {
        return ts.factory.createIdentifier("____");
    }

    return node.declarations[0].name;
}

export function transformForInitializer(
    context: TransformationContext,
    initializer: ts.ForInitializer,
    block: lua.Block
): lua.Identifier {
    const valueVariable = lua.createIdentifier("____value");

    context.pushScope(ScopeType.LoopInitializer);

    if (ts.isVariableDeclarationList(initializer)) {
        // Declaration of new variable

        const binding = getVariableDeclarationBinding(context, initializer);
        if (ts.isArrayBindingPattern(binding) || ts.isObjectBindingPattern(binding)) {
            const { precedingStatements, result: bindings } = transformInPrecedingStatementScope(context, () =>
                transformBindingPattern(context, binding, valueVariable)
            );
            block.statements.unshift(...precedingStatements, ...bindings);
        } else {
            // Single variable declared in for loop
            context.popScope();
            return transformIdentifier(context, binding);
        }
    } else {
        // Assignment to existing variable(s)

        block.statements.unshift(
            ...(isAssignmentPattern(initializer)
                ? transformAssignmentPattern(context, initializer, valueVariable, false)
                : transformAssignment(context, initializer, valueVariable))
        );
    }

    context.popScope();
    return valueVariable;
}

export function invertCondition(expression: lua.Expression) {
    if (lua.isUnaryExpression(expression) && expression.operator === lua.SyntaxKind.NotOperator) {
        return expression.operand;
    } else {
        const notExpression = lua.createUnaryExpression(expression, lua.SyntaxKind.NotOperator);
        lua.setNodePosition(notExpression, lua.getOriginalPos(expression));
        return notExpression;
    }
}
