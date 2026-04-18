import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { transformInPrecedingStatementScope } from "../../utils/preceding-statements";
import { checkVariableDeclarationList, transformVariableDeclaration } from "../variable-declaration";
import { invertCondition, transformLoopBody } from "./utils";
import { LoopContinued, performHoisting, ScopeType } from "../../utils/scope";
import { transformBlockOrStatement } from "../block";

function getCapturedLetNamesInFor(context: TransformationContext, statement: ts.ForStatement): ts.Identifier[] {
    const init = statement.initializer;
    if (!init || !ts.isVariableDeclarationList(init)) return [];
    const isLetOrConst = (init.flags & ts.NodeFlags.Let) !== 0 || (init.flags & ts.NodeFlags.Const) !== 0;
    if (!isLetOrConst) return [];

    const letNames: ts.Identifier[] = [];
    for (const decl of init.declarations) {
        if (ts.isIdentifier(decl.name)) letNames.push(decl.name);
    }
    if (letNames.length === 0) return [];

    const checker = context.checker;
    const targetSymbols = new Set<ts.Symbol>();
    for (const n of letNames) {
        const s = checker.getSymbolAtLocation(n);
        if (s) targetSymbols.add(s);
    }
    if (targetSymbols.size === 0) return [];

    const captured = new Set<ts.Symbol>();

    function visit(node: ts.Node, insideFunction: boolean): void {
        const isFn =
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isFunctionDeclaration(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isConstructorDeclaration(node);

        if (insideFunction && ts.isIdentifier(node)) {
            const sym = checker.getSymbolAtLocation(node);
            if (sym && targetSymbols.has(sym)) captured.add(sym);
        }
        ts.forEachChild(node, c => visit(c, insideFunction || isFn));
    }

    visit(statement.statement, false);
    if (statement.condition) visit(statement.condition, false);
    if (statement.incrementor) visit(statement.incrementor, false);

    if (captured.size === 0) return [];
    return letNames.filter(n => {
        const s = checker.getSymbolAtLocation(n);
        return s !== undefined && captured.has(s);
    });
}

// Walks transformed Lua statements and prepends syncStmts before every continue-exit
// that targets this loop scope. Handles WithGoto, WithContinue, and WithRepeatBreak modes.
function injectSyncBeforeContinueExits(
    statements: lua.Statement[],
    scopeId: number,
    continueLabel: string,
    continueMode: LoopContinued | undefined,
    syncStmts: lua.Statement[]
): void {
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];

        // WithGoto: `goto __continueN`
        if (continueMode === LoopContinued.WithGoto && lua.isGotoStatement(stmt) && stmt.label === continueLabel) {
            statements.splice(i, 0, ...syncStmts.map(cloneSimpleStatement));
            i += syncStmts.length;
            continue;
        }

        // WithContinue: `continue`
        if (continueMode === LoopContinued.WithContinue && lua.isContinueStatement(stmt)) {
            statements.splice(i, 0, ...syncStmts.map(cloneSimpleStatement));
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
            statements.splice(i, 0, ...syncStmts.map(cloneSimpleStatement));
            i += syncStmts.length + 1; // skip past both the assignment and the break
            continue;
        }

        // Recurse into nested blocks that can contain continue-exits for this loop.
        // Skip nested loops — their continues target themselves, not us.
        if (lua.isDoStatement(stmt)) {
            injectSyncBeforeContinueExits(stmt.statements, scopeId, continueLabel, continueMode, syncStmts);
        } else if (lua.isIfStatement(stmt)) {
            injectIntoIf(stmt, scopeId, continueLabel, continueMode, syncStmts);
        }
    }
}

function injectIntoIf(
    stmt: lua.IfStatement,
    scopeId: number,
    continueLabel: string,
    continueMode: LoopContinued | undefined,
    syncStmts: lua.Statement[]
): void {
    injectSyncBeforeContinueExits(stmt.ifBlock.statements, scopeId, continueLabel, continueMode, syncStmts);
    if (stmt.elseBlock) {
        if (lua.isBlock(stmt.elseBlock)) {
            injectSyncBeforeContinueExits(stmt.elseBlock.statements, scopeId, continueLabel, continueMode, syncStmts);
        } else {
            injectIntoIf(stmt.elseBlock, scopeId, continueLabel, continueMode, syncStmts);
        }
    }
}

function cloneSimpleStatement(stmt: lua.Statement): lua.Statement {
    // Sync statements are always `____sync_X = X` assignments; recreate to avoid sharing nodes.
    if (lua.isAssignmentStatement(stmt)) {
        return lua.createAssignmentStatement(
            stmt.left.map(l => (lua.isIdentifier(l) ? lua.createIdentifier(l.text) : l)),
            stmt.right.map(r => (lua.isIdentifier(r) ? lua.createIdentifier(r.text) : r))
        );
    }
    return stmt;
}

function wrapBodyWithContinueMode(
    innerBodyStatements: lua.Statement[],
    continueMode: LoopContinued | undefined,
    continueLabel: string
): lua.Statement[] {
    switch (continueMode) {
        case undefined:
        case LoopContinued.WithContinue:
            return [lua.createDoStatement(innerBodyStatements)];

        case LoopContinued.WithGoto:
            return [lua.createDoStatement(innerBodyStatements), lua.createLabelStatement(continueLabel)];

        case LoopContinued.WithRepeatBreak: {
            const identifier = lua.createIdentifier(continueLabel);
            const literalTrue = lua.createBooleanLiteral(true);

            const transformedBodyStatements: lua.Statement[] = [];
            let bodyBroken = false;
            for (const s of innerBodyStatements) {
                transformedBodyStatements.push(s);
                if (lua.isBreakStatement(s)) {
                    bodyBroken = true;
                    break;
                }
            }
            if (!bodyBroken) {
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

export const transformForStatement: FunctionVisitor<ts.ForStatement> = (statement, context) => {
    const capturedLetNames = getCapturedLetNamesInFor(context, statement);
    if (capturedLetNames.length === 0) {
        return transformForStatementSimple(statement, context);
    }
    return transformForStatementWithPerIterationBinding(statement, context, capturedLetNames);
};

function transformForStatementSimple(statement: ts.ForStatement, context: TransformationContext): lua.Statement {
    const result: lua.Statement[] = [];

    context.pushScope(ScopeType.Loop, statement);

    if (statement.initializer) {
        if (ts.isVariableDeclarationList(statement.initializer)) {
            checkVariableDeclarationList(context, statement.initializer);
            // local initializer = value
            result.push(...statement.initializer.declarations.flatMap(d => transformVariableDeclaration(context, d)));
        } else {
            result.push(...context.transformStatements(ts.factory.createExpressionStatement(statement.initializer)));
        }
    }

    const body: lua.Statement[] = transformLoopBody(context, statement);

    let condition: lua.Expression;
    if (statement.condition) {
        const tsCondition = statement.condition;
        const { precedingStatements: conditionPrecedingStatements, result } = transformInPrecedingStatementScope(
            context,
            () => context.transformExpression(tsCondition)
        );
        condition = result;

        // If condition has preceding statements, ensure they are executed every iteration by using the form:
        //
        // while true do
        //     condition's preceding statements
        //     if not condition then
        //         break
        //     end
        //     ...
        // end
        if (conditionPrecedingStatements.length > 0) {
            conditionPrecedingStatements.push(
                lua.createIfStatement(
                    invertCondition(condition),
                    lua.createBlock([lua.createBreakStatement()]),
                    undefined,
                    statement.condition
                )
            );
            body.unshift(...conditionPrecedingStatements);
            condition = lua.createBooleanLiteral(true);
        }
    } else {
        condition = lua.createBooleanLiteral(true);
    }

    if (statement.incrementor) {
        body.push(...context.transformStatements(ts.factory.createExpressionStatement(statement.incrementor)));
    }

    // while (condition) do ... end
    result.push(lua.createWhileStatement(lua.createBlock(body), condition, statement));

    context.popScope();

    return lua.createDoStatement(result, statement);
}

function transformForStatementWithPerIterationBinding(
    statement: ts.ForStatement,
    context: TransformationContext,
    capturedNames: ts.Identifier[]
): lua.Statement {
    const result: lua.Statement[] = [];
    const initializer = statement.initializer as ts.VariableDeclarationList;

    // Outer: normal variable declarations (user's names).
    checkVariableDeclarationList(context, initializer);
    result.push(...initializer.declarations.flatMap(d => transformVariableDeclaration(context, d)));

    // Transform body ourselves (equivalent to transformLoopBody internals) so we can inject sync.
    context.pushScope(ScopeType.Loop, statement);
    const rawBody = performHoisting(context, transformBlockOrStatement(context, statement.statement));
    const scope = context.popScope();
    const scopeId = scope.id;
    const continueLabel = `__continue${scopeId}`;

    // One sync slot per captured name: `____sync_<name>_<scopeId>`.
    const syncIdentifiers = capturedNames.map(n => lua.createIdentifier(`____sync_${n.text}_${scopeId}`));

    // Inner body: declare `local <name> = <name>` for each captured name (fresh per-iteration binding).
    const innerDecls = capturedNames.map(n =>
        lua.createVariableDeclarationStatement(lua.createIdentifier(n.text), lua.createIdentifier(n.text))
    );

    // Sync statement(s): `____sync_X = X` for each captured name.
    const syncAssignments: lua.Statement[] = capturedNames.map((n, i) =>
        lua.createAssignmentStatement(syncIdentifiers[i], lua.createIdentifier(n.text))
    );

    // Inject sync before every continue-exit targeting this loop.
    injectSyncBeforeContinueExits(rawBody, scopeId, continueLabel, scope.loopContinued, syncAssignments);

    // Append sync at natural end of body (so falling-through-body also propagates mutations).
    const innerBody: lua.Statement[] = [...innerDecls, ...rawBody, ...syncAssignments.map(cloneSimpleStatement)];

    // Apply continue-wrap around the inner body (do...end plus label or repeat-break structure).
    const wrappedBody = wrapBodyWithContinueMode(innerBody, scope.loopContinued, continueLabel);

    // Copy sync slots back to outer vars after the per-iter block.
    const syncBack: lua.Statement[] = capturedNames.map((n, i) =>
        lua.createAssignmentStatement(lua.createIdentifier(n.text), syncIdentifiers[i])
    );

    // While-body assembly: [sync slot decls, wrappedBody, syncBack, incrementor].
    const whileBody: lua.Statement[] = [
        lua.createVariableDeclarationStatement(syncIdentifiers.map(id => lua.createIdentifier(id.text))),
        ...wrappedBody,
        ...syncBack,
    ];

    if (statement.incrementor) {
        whileBody.push(...context.transformStatements(ts.factory.createExpressionStatement(statement.incrementor)));
    }

    // Condition (evaluated against the outer variables).
    let condition: lua.Expression;
    if (statement.condition) {
        const tsCondition = statement.condition;
        const { precedingStatements: conditionPrecedingStatements, result: condResult } =
            transformInPrecedingStatementScope(context, () => context.transformExpression(tsCondition));
        condition = condResult;

        if (conditionPrecedingStatements.length > 0) {
            conditionPrecedingStatements.push(
                lua.createIfStatement(
                    invertCondition(condition),
                    lua.createBlock([lua.createBreakStatement()]),
                    undefined,
                    statement.condition
                )
            );
            whileBody.unshift(...conditionPrecedingStatements);
            condition = lua.createBooleanLiteral(true);
        }
    } else {
        condition = lua.createBooleanLiteral(true);
    }

    result.push(lua.createWhileStatement(lua.createBlock(whileBody), condition, statement));

    return lua.createDoStatement(result, statement);
}
