import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { transformInPrecedingStatementScope } from "../../utils/preceding-statements";
import { ScopeType } from "../../utils/scope";
import { checkVariableDeclarationList, transformVariableDeclaration } from "../variable-declaration";
import { invertCondition, transformLoopBody } from "./utils";

// Collect identifiers bound by a for-loop `let`/`const` initializer that are captured
// by any closure in the body/condition/incrementor. These need per-iteration binding
// so captured closures see a fresh binding each iteration (ES2015 spec).
function getCapturedLetNamesInFor(context: TransformationContext, statement: ts.ForStatement): ts.Identifier[] {
    const init = statement.initializer;
    if (!init || !ts.isVariableDeclarationList(init)) return [];
    const isLetOrConst = (init.flags & ts.NodeFlags.Let) !== 0 || (init.flags & ts.NodeFlags.Const) !== 0;
    if (!isLetOrConst) return [];

    const letNames: ts.Identifier[] = [];
    for (const decl of init.declarations) {
        collectBoundIdentifiers(decl.name, letNames);
    }
    if (letNames.length === 0) return [];

    const checker = context.checker;
    const nameTexts = new Set(letNames.map(n => n.text));
    const targetSymbols = new Set<ts.Symbol>();
    for (const n of letNames) {
        const s = checker.getSymbolAtLocation(n);
        if (s) targetSymbols.add(s);
    }
    if (targetSymbols.size === 0) return [];

    const captured = new Set<ts.Symbol>();

    function visit(node: ts.Node, insideFunction: boolean): void {
        // A function literal that's the direct callee of a call expression is an IIFE —
        // its closure doesn't outlive the iteration, so it doesn't need per-iter binding.
        // Body references still hit the shared outer binding, which matches JS semantics
        // since the IIFE runs synchronously within the current iteration.
        const isEscapingFn =
            (ts.isFunctionExpression(node) ||
                ts.isArrowFunction(node) ||
                ts.isFunctionDeclaration(node) ||
                ts.isMethodDeclaration(node) ||
                ts.isGetAccessorDeclaration(node) ||
                ts.isSetAccessorDeclaration(node) ||
                ts.isConstructorDeclaration(node)) &&
            !isIIFECallee(node);

        // Fast path: skip the checker query for identifiers whose text can't match any
        // bound name — avoids a symbol lookup on every identifier in the loop body.
        if (insideFunction && ts.isIdentifier(node) && nameTexts.has(node.text)) {
            const sym = checker.getSymbolAtLocation(node);
            if (sym && targetSymbols.has(sym)) captured.add(sym);
        }
        ts.forEachChild(node, c => visit(c, insideFunction || isEscapingFn));
    }

    // `(fn)()` and `((fn))()` wrap the function in ParenthesizedExpression nodes,
    // so walk up the paren chain before checking for the enclosing CallExpression.
    function isIIFECallee(fn: ts.Node): boolean {
        let outer: ts.Node = fn;
        while (outer.parent && ts.isParenthesizedExpression(outer.parent)) outer = outer.parent;
        const parent = outer.parent;
        return parent !== undefined && ts.isCallExpression(parent) && parent.expression === outer;
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

function collectBoundIdentifiers(name: ts.BindingName, out: ts.Identifier[]): void {
    if (ts.isIdentifier(name)) {
        out.push(name);
        return;
    }
    // Destructuring: recurse into array/object binding patterns.
    for (const element of name.elements) {
        if (ts.isBindingElement(element)) {
            collectBoundIdentifiers(element.name, out);
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

// Per-iteration-binding transform (ES2015 for-let semantics).
//
// Shape of the emitted Lua (for captured name `i`, single variable):
//
//     local i = 0                    -- outer binding (for the incrementor)
//     while cond do
//         local ____sync_i           -- slot carries body mutations out
//         do
//             local i = i            -- fresh per-iteration binding (closures capture this)
//             ... body ...           -- sync `____sync_i = i` injected before any continue-exit
//             ____sync_i = i         -- sync at natural end of body
//         end
//         i = ____sync_i             -- propagate mutations back to outer i
//         incrementor                -- operates on outer i
//     end
function transformForStatementWithPerIterationBinding(
    statement: ts.ForStatement,
    context: TransformationContext,
    capturedNames: ts.Identifier[]
): lua.Statement {
    const result: lua.Statement[] = [];
    const initializer = statement.initializer as ts.VariableDeclarationList;

    context.pushScope(ScopeType.Loop, statement);

    // Outer: normal variable declarations (user's names).
    checkVariableDeclarationList(context, initializer);
    result.push(...initializer.declarations.flatMap(d => transformVariableDeclaration(context, d)));

    // Prologue (inside per-iter scope): `local <name> = <name>` for each captured name — fresh binding.
    const prologue = capturedNames.map(n =>
        lua.createVariableDeclarationStatement(lua.createIdentifier(n.text), lua.createIdentifier(n.text))
    );

    // Epilogue (inside per-iter scope, natural end + before every continue-exit): `____sync_<name> = <name>`.
    // The outer do-statement returned at the end scopes the sync slots, so the plain-text name is collision-free
    // across sibling/nested per-iter-bound for loops.
    const syncIdentifiers = capturedNames.map(n => lua.createIdentifier(`____sync_${n.text}`));
    const epilogue = capturedNames.map((n, i) =>
        lua.createAssignmentStatement(syncIdentifiers[i], lua.createIdentifier(n.text))
    );

    const innerBody = transformLoopBody(context, statement, { innerPrologue: prologue, innerEpilogue: epilogue });

    // While body: [sync slot decls, innerBody from transformLoopBody, sync-back, incrementor].
    const syncBack: lua.Statement[] = capturedNames.map((n, i) =>
        lua.createAssignmentStatement(lua.createIdentifier(n.text), lua.createIdentifier(syncIdentifiers[i].text))
    );
    const whileBody: lua.Statement[] = [
        lua.createVariableDeclarationStatement(syncIdentifiers.map(id => lua.createIdentifier(id.text))),
        ...innerBody,
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

    context.popScope();

    // Wrap the outer in a do so the sync slots (and the outer `local i`) live in their own scope,
    // giving each per-iter-bound for loop an independent sync-slot namespace.
    return lua.createDoStatement(result, statement);
}
