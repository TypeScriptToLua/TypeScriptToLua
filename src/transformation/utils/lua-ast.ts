import * as ts from "typescript";
import * as assert from "assert";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { getCurrentNamespace } from "../visitors/namespace";
import { createExportedIdentifier, getIdentifierExportScope } from "./export";
import { findScope, peekScope, ScopeType } from "./scope";
import { isFunctionType } from "./typescript";

export type OneToManyVisitorResult<T extends lua.Node> = T | T[] | undefined;
export function unwrapVisitorResult<T extends lua.Node>(result: OneToManyVisitorResult<T>): T[] {
    if (result === undefined || result === null) {
        return [];
    } else if (Array.isArray(result)) {
        return result;
    } else {
        return [result];
    }
}

export function createSelfIdentifier(tsOriginal?: ts.Node): lua.Identifier {
    return lua.createIdentifier("self", tsOriginal, undefined, "this");
}

export function createExportsIdentifier(): lua.Identifier {
    return lua.createIdentifier("____exports");
}

export function createExpressionPlusOne(expression: lua.Expression): lua.Expression {
    if (lua.isNumericLiteral(expression)) {
        const newNode = lua.cloneNode(expression);
        newNode.value += 1;
        return newNode;
    }

    if (lua.isBinaryExpression(expression)) {
        if (
            expression.operator === lua.SyntaxKind.SubtractionOperator &&
            lua.isNumericLiteral(expression.right) &&
            expression.right.value === 1
        ) {
            return expression.left;
        }

        expression = lua.createParenthesizedExpression(expression);
    }

    return lua.createBinaryExpression(expression, lua.createNumericLiteral(1), lua.SyntaxKind.AdditionOperator);
}

export function createImmediatelyInvokedFunctionExpression(
    statements: lua.Statement[],
    result: lua.Expression | lua.Expression[],
    tsOriginal?: ts.Node
): lua.CallExpression {
    const body = statements ? statements.slice(0) : [];
    body.push(lua.createReturnStatement(Array.isArray(result) ? result : [result]));
    const flags = statements.length === 0 ? lua.FunctionExpressionFlags.Inline : lua.FunctionExpressionFlags.None;
    const iife = lua.createFunctionExpression(lua.createBlock(body), undefined, undefined, undefined, flags);
    return lua.createCallExpression(lua.createParenthesizedExpression(iife), [], tsOriginal);
}

export function createUnpackCall(
    context: TransformationContext,
    expression: lua.Expression,
    tsOriginal?: ts.Node
): lua.Expression {
    const unpack =
        context.luaTarget === LuaTarget.Lua51 || context.luaTarget === LuaTarget.LuaJIT
            ? lua.createIdentifier("unpack")
            : lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("unpack"));

    return lua.createCallExpression(unpack, [expression], tsOriginal);
}

export function wrapInTable(...expressions: lua.Expression[]): lua.ParenthesizedExpression {
    const fields = expressions.map(e => lua.createTableFieldExpression(e));
    return lua.createParenthesizedExpression(lua.createTableExpression(fields));
}

export function wrapInToStringForConcat(expression: lua.Expression): lua.Expression {
    if (
        lua.isStringLiteral(expression) ||
        lua.isNumericLiteral(expression) ||
        (lua.isBinaryExpression(expression) && expression.operator === lua.SyntaxKind.ConcatOperator)
    ) {
        return expression;
    }

    return lua.createCallExpression(lua.createIdentifier("tostring"), [expression]);
}

export function createHoistableVariableDeclarationStatement(
    context: TransformationContext,
    identifier: lua.Identifier,
    initializer?: lua.Expression,
    tsOriginal?: ts.Node
): lua.AssignmentStatement | lua.VariableDeclarationStatement {
    const declaration = lua.createVariableDeclarationStatement(identifier, initializer, tsOriginal);
    if (!context.options.noHoisting && identifier.symbolId) {
        const scope = peekScope(context);
        assert(scope.type !== ScopeType.Switch);

        if (!scope.variableDeclarations) {
            scope.variableDeclarations = [];
        }

        scope.variableDeclarations.push(declaration);
    }

    return declaration;
}

export function createLocalOrExportedOrGlobalDeclaration(
    context: TransformationContext,
    lhs: lua.Identifier | lua.Identifier[],
    rhs?: lua.Expression | lua.Expression[],
    tsOriginal?: ts.Node,
    overrideExportScope?: ts.SourceFile | ts.ModuleDeclaration
): lua.Statement[] {
    let declaration: lua.VariableDeclarationStatement | undefined;
    let assignment: lua.AssignmentStatement | undefined;

    const isVariableDeclaration = tsOriginal !== undefined && ts.isVariableDeclaration(tsOriginal);
    const isFunctionDeclaration = tsOriginal !== undefined && ts.isFunctionDeclaration(tsOriginal);

    const identifiers = Array.isArray(lhs) ? lhs : [lhs];
    if (identifiers.length === 0) {
        return [];
    }

    const exportScope = overrideExportScope ?? getIdentifierExportScope(context, identifiers[0]);
    if (exportScope) {
        // exported
        if (!rhs) {
            return [];
        } else {
            assignment = lua.createAssignmentStatement(
                identifiers.map(identifier => createExportedIdentifier(context, identifier, exportScope)),
                rhs,
                tsOriginal
            );
        }
    } else {
        const insideFunction = findScope(context, ScopeType.Function) !== undefined;

        if (context.isModule || getCurrentNamespace(context) || insideFunction || isVariableDeclaration) {
            const scope = peekScope(context);

            const isPossibleWrappedFunction =
                !isFunctionDeclaration &&
                tsOriginal &&
                ts.isVariableDeclaration(tsOriginal) &&
                tsOriginal.initializer &&
                isFunctionType(context, context.checker.getTypeAtLocation(tsOriginal.initializer));

            if (isPossibleWrappedFunction || scope.type === ScopeType.Switch) {
                // Split declaration and assignment for wrapped function types to allow recursion
                declaration = lua.createVariableDeclarationStatement(lhs, undefined, tsOriginal);
                assignment = lua.createAssignmentStatement(lhs, rhs, tsOriginal);
            } else {
                declaration = lua.createVariableDeclarationStatement(lhs, rhs, tsOriginal);
            }

            if (!context.options.noHoisting) {
                // Remember local variable declarations for hoisting later
                if (!scope.variableDeclarations) {
                    scope.variableDeclarations = [];
                }

                scope.variableDeclarations.push(declaration);

                if (scope.type === ScopeType.Switch) {
                    declaration = undefined;
                }
            }
        } else if (rhs) {
            // global
            assignment = lua.createAssignmentStatement(lhs, rhs, tsOriginal);
        } else {
            return [];
        }
    }

    if (!context.options.noHoisting && isFunctionDeclaration) {
        // Remember function definitions for hoisting later
        const functionSymbolId = (lhs as lua.Identifier).symbolId;
        const scope = peekScope(context);
        if (functionSymbolId && scope.functionDefinitions) {
            const definitions = scope.functionDefinitions.get(functionSymbolId);
            if (definitions) {
                definitions.definition = declaration ?? assignment;
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
