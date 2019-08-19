import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as tstl from "../../LuaAST";
import { TransformationContext } from "../context";
import { getCurrentNamespace } from "../transformers/namespace";
import { UndefinedScope } from "./errors";
import { createExportedIdentifier, getIdentifierExportScope } from "./export";
import { findScope, peekScope, ScopeType } from "./scope";
import { isFirstDeclaration, isFunctionType } from "./typescript";

export type OneToManyVisitorResult<T extends tstl.Node> = T | T[] | undefined;
export function unwrapVisitorResult<T extends tstl.Node>(result: OneToManyVisitorResult<T>): T[] {
    if (result === undefined || result === null) {
        return [];
    } else if (Array.isArray(result)) {
        return result;
    } else {
        return [result];
    }
}

export function createSelfIdentifier(tsOriginal?: ts.Node): tstl.Identifier {
    return tstl.createIdentifier("self", tsOriginal, undefined, "this");
}

export function createExportsIdentifier(): tstl.Identifier {
    return tstl.createIdentifier("____exports");
}

export function replaceStatementInParent(oldNode: tstl.Statement, newNode?: tstl.Statement): void {
    if (!oldNode.parent) {
        throw new Error("node has not yet been assigned a parent");
    }

    if (tstl.isBlock(oldNode.parent) || tstl.isDoStatement(oldNode.parent)) {
        if (newNode) {
            oldNode.parent.statements.splice(oldNode.parent.statements.indexOf(oldNode), 1, newNode);
        } else {
            oldNode.parent.statements.splice(oldNode.parent.statements.indexOf(oldNode), 1);
        }
    } else {
        throw new Error("unexpected parent type");
    }
}

export function createExpressionPlusOne(expression: tstl.Expression): tstl.Expression {
    if (tstl.isNumericLiteral(expression)) {
        const newNode = tstl.cloneNode(expression);
        newNode.value += 1;
        return newNode;
    }

    if (tstl.isBinaryExpression(expression)) {
        if (
            expression.operator === tstl.SyntaxKind.SubtractionOperator &&
            tstl.isNumericLiteral(expression.right) &&
            expression.right.value === 1
        ) {
            return expression.left;
        }

        expression = tstl.createParenthesizedExpression(expression);
    }

    return tstl.createBinaryExpression(expression, tstl.createNumericLiteral(1), tstl.SyntaxKind.AdditionOperator);
}

export function createImmediatelyInvokedFunctionExpression(
    statements: tstl.Statement[],
    result: tstl.Expression | tstl.Expression[],
    tsOriginal?: ts.Node
): tstl.CallExpression {
    const body = statements ? statements.slice(0) : [];
    body.push(tstl.createReturnStatement(Array.isArray(result) ? result : [result]));
    const flags = statements.length === 0 ? tstl.FunctionExpressionFlags.Inline : tstl.FunctionExpressionFlags.None;
    const iife = tstl.createFunctionExpression(tstl.createBlock(body), undefined, undefined, undefined, flags);
    return tstl.createCallExpression(tstl.createParenthesizedExpression(iife), [], tsOriginal);
}

export function createUnpackCall(
    context: TransformationContext,
    expression: tstl.Expression,
    tsOriginal?: ts.Node
): tstl.Expression {
    const unpack =
        context.luaTarget === LuaTarget.Lua51 || context.luaTarget === LuaTarget.LuaJIT
            ? tstl.createIdentifier("unpack")
            : tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("unpack"));

    return tstl.createCallExpression(unpack, [expression], tsOriginal);
}

export function wrapInTable(...expressions: tstl.Expression[]): tstl.ParenthesizedExpression {
    const fields = expressions.map(e => tstl.createTableFieldExpression(e));
    return tstl.createParenthesizedExpression(tstl.createTableExpression(fields));
}

export function wrapInToStringForConcat(expression: tstl.Expression): tstl.Expression {
    if (
        tstl.isStringLiteral(expression) ||
        tstl.isNumericLiteral(expression) ||
        (tstl.isBinaryExpression(expression) && expression.operator === tstl.SyntaxKind.ConcatOperator)
    ) {
        return expression;
    }

    return tstl.createCallExpression(tstl.createIdentifier("tostring"), [expression]);
}

export function createHoistableVariableDeclarationStatement(
    context: TransformationContext,
    identifier: tstl.Identifier,
    initializer?: tstl.Expression,
    tsOriginal?: ts.Node,
    parent?: tstl.Node
): tstl.AssignmentStatement | tstl.VariableDeclarationStatement {
    const declaration = tstl.createVariableDeclarationStatement(identifier, initializer, tsOriginal, parent);
    if (!context.options.noHoisting && identifier.symbolId) {
        const scope = peekScope(context);
        if (!scope.variableDeclarations) {
            scope.variableDeclarations = [];
        }

        scope.variableDeclarations.push(declaration);
    }

    return declaration;
}

export function createLocalOrExportedOrGlobalDeclaration(
    context: TransformationContext,
    lhs: tstl.Identifier | tstl.Identifier[],
    rhs?: tstl.Expression | tstl.Expression[],
    tsOriginal?: ts.Node,
    parent?: tstl.Node,
    overrideExportScope?: ts.SourceFile | ts.ModuleDeclaration
): tstl.Statement[] {
    let declaration: tstl.VariableDeclarationStatement | undefined;
    let assignment: tstl.AssignmentStatement | undefined;

    const functionDeclaration = tsOriginal && ts.isFunctionDeclaration(tsOriginal) ? tsOriginal : undefined;

    const identifiers = Array.isArray(lhs) ? lhs : [lhs];
    if (identifiers.length === 0) {
        return [];
    }

    const exportScope = overrideExportScope || getIdentifierExportScope(context, identifiers[0]);
    if (exportScope) {
        // exported
        if (!rhs) {
            return [];
        } else {
            assignment = tstl.createAssignmentStatement(
                identifiers.map(identifier => createExportedIdentifier(context, identifier, exportScope)),
                rhs,
                tsOriginal,
                parent
            );
        }
    } else {
        const insideFunction = findScope(context, ScopeType.Function) !== undefined;
        let isLetOrConst = false;
        let isVariableFirstDeclaration = true; // var can have multiple declarations for the same variable :/
        if (tsOriginal && ts.isVariableDeclaration(tsOriginal) && tsOriginal.parent) {
            isLetOrConst = (tsOriginal.parent.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
            isVariableFirstDeclaration = isLetOrConst || isFirstDeclaration(context, tsOriginal);
        }

        if (
            (context.isModule || getCurrentNamespace(context) || insideFunction || isLetOrConst) &&
            isVariableFirstDeclaration
        ) {
            // local
            const isPossibleWrappedFunction =
                !functionDeclaration &&
                tsOriginal &&
                ts.isVariableDeclaration(tsOriginal) &&
                tsOriginal.initializer &&
                isFunctionType(context, context.checker.getTypeAtLocation(tsOriginal.initializer));
            if (isPossibleWrappedFunction) {
                // Split declaration and assignment for wrapped function types to allow recursion
                declaration = tstl.createVariableDeclarationStatement(lhs, undefined, tsOriginal, parent);
                assignment = tstl.createAssignmentStatement(lhs, rhs, tsOriginal, parent);
            } else {
                declaration = tstl.createVariableDeclarationStatement(lhs, rhs, tsOriginal, parent);
            }

            if (!context.options.noHoisting) {
                // Remember local variable declarations for hoisting later
                const scope =
                    isLetOrConst || functionDeclaration
                        ? peekScope(context)
                        : findScope(context, ScopeType.Function | ScopeType.File);

                if (scope === undefined) {
                    throw UndefinedScope();
                }

                if (!scope.variableDeclarations) {
                    scope.variableDeclarations = [];
                }

                scope.variableDeclarations.push(declaration);
            }
        } else if (rhs) {
            // global
            assignment = tstl.createAssignmentStatement(lhs, rhs, tsOriginal, parent);
        } else {
            return [];
        }
    }

    if (!context.options.noHoisting && functionDeclaration) {
        // Remember function definitions for hoisting later
        const functionSymbolId = (lhs as tstl.Identifier).symbolId;
        const scope = peekScope(context);
        if (functionSymbolId && scope.functionDefinitions) {
            const definitions = scope.functionDefinitions.get(functionSymbolId);
            if (definitions) {
                definitions.definition = declaration || assignment;
            }
        }
    }

    if (declaration && assignment) {
        return [declaration, assignment];
    } else if (declaration) {
        return [declaration];
    } else if (assignment) {
        return [assignment];
    } else {
        return [];
    }
}
