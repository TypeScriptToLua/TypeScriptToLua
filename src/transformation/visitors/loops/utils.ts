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

export interface LoopBodyOptions {
    // Statements prepended inside the per-iteration scope, before the user body.
    innerPrologue?: lua.Statement[];
    // Statements appended inside the per-iteration scope at the natural end of the body,
    // and also injected immediately before every continue-exit that targets this loop.
    innerEpilogue?: lua.Statement[];
}

export function transformLoopBody(
    context: TransformationContext,
    loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement,
    options?: LoopBodyOptions
): lua.Statement[] {
    context.pushScope(ScopeType.Loop, loop);
    const body = performHoisting(context, transformBlockOrStatement(context, loop.statement));
    const scope = context.popScope();
    const scopeId = scope.id;
    const continueLabel = `__continue${scopeId}`;

    const prologue = options?.innerPrologue ?? [];
    const epilogue = options?.innerEpilogue ?? [];
    const needsScope = prologue.length > 0 || epilogue.length > 0;

    // Propagate body mutations on every continue-exit that targets this loop.
    if (epilogue.length > 0 && scope.loopContinued !== undefined) {
        injectBeforeContinueExits(body, scope.loopContinued, continueLabel, epilogue);
    }

    const iterationBody: lua.Statement[] = needsScope
        ? [...prologue, ...body, ...epilogue.map(cloneSyncStatement)]
        : body;

    switch (scope.loopContinued) {
        case undefined:
        case LoopContinued.WithContinue:
            return needsScope ? [lua.createDoStatement(iterationBody)] : iterationBody;

        case LoopContinued.WithGoto:
            return [lua.createDoStatement(iterationBody), lua.createLabelStatement(continueLabel)];

        case LoopContinued.WithRepeatBreak: {
            const identifier = lua.createIdentifier(continueLabel);
            const literalTrue = lua.createBooleanLiteral(true);

            // If there is a break in the body statements, do not include any code afterwards
            const transformedBodyStatements: lua.Statement[] = [];
            let bodyBroken = false;
            for (const statement of iterationBody) {
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
}

// Walks transformed Lua statements and prepends syncStmts before every continue-exit
// that targets this loop scope. Handles WithGoto, WithContinue, and WithRepeatBreak modes.
function injectBeforeContinueExits(
    statements: lua.Statement[],
    continueMode: LoopContinued,
    continueLabel: string,
    syncStmts: lua.Statement[]
): void {
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];

        // WithGoto: `goto __continueN`
        if (continueMode === LoopContinued.WithGoto && lua.isGotoStatement(stmt) && stmt.label === continueLabel) {
            statements.splice(i, 0, ...syncStmts.map(cloneSyncStatement));
            i += syncStmts.length;
            continue;
        }

        // WithContinue: `continue`
        if (continueMode === LoopContinued.WithContinue && lua.isContinueStatement(stmt)) {
            statements.splice(i, 0, ...syncStmts.map(cloneSyncStatement));
            i += syncStmts.length;
            continue;
        }

        // WithRepeatBreak: `__continueN = true; break`
        if (
            continueMode === LoopContinued.WithRepeatBreak &&
            lua.isAssignmentStatement(stmt) &&
            stmt.left.length === 1 &&
            lua.isIdentifier(stmt.left[0]) &&
            stmt.left[0].text === continueLabel &&
            i + 1 < statements.length &&
            lua.isBreakStatement(statements[i + 1])
        ) {
            statements.splice(i, 0, ...syncStmts.map(cloneSyncStatement));
            i += syncStmts.length + 1; // skip past both the assignment and the break
            continue;
        }

        // Recurse into nested blocks that can contain continue-exits for this loop.
        // Skip nested loops — their continues target themselves, not us.
        if (lua.isDoStatement(stmt)) {
            injectBeforeContinueExits(stmt.statements, continueMode, continueLabel, syncStmts);
        } else if (lua.isIfStatement(stmt)) {
            injectIntoIf(stmt, continueMode, continueLabel, syncStmts);
        }
    }
}

function injectIntoIf(
    stmt: lua.IfStatement,
    continueMode: LoopContinued,
    continueLabel: string,
    syncStmts: lua.Statement[]
): void {
    injectBeforeContinueExits(stmt.ifBlock.statements, continueMode, continueLabel, syncStmts);
    if (stmt.elseBlock) {
        if (lua.isBlock(stmt.elseBlock)) {
            injectBeforeContinueExits(stmt.elseBlock.statements, continueMode, continueLabel, syncStmts);
        } else {
            injectIntoIf(stmt.elseBlock, continueMode, continueLabel, syncStmts);
        }
    }
}

// Epilogue/prologue statements are always `X = Y` assignments between identifiers; recreate to avoid sharing nodes.
function cloneSyncStatement(stmt: lua.Statement): lua.Statement {
    if (lua.isAssignmentStatement(stmt)) {
        return lua.createAssignmentStatement(
            stmt.left.map(l => (lua.isIdentifier(l) ? lua.createIdentifier(l.text) : l)),
            stmt.right.map(r => (lua.isIdentifier(r) ? lua.createIdentifier(r.text) : r))
        );
    }
    return stmt;
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

    context.pushScope(ScopeType.LoopInitializer, initializer);

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
