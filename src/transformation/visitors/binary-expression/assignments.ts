import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { cast } from "../../../utils";
import { TransformationContext } from "../../context";
import { validateAssignment } from "../../utils/assignment-validation";
import { createExportedIdentifier, getDependenciesOfSymbol, isSymbolExported } from "../../utils/export";
import { createUnpackCall, wrapInTable } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isDestructuringAssignment } from "../../utils/typescript";
import { isArrayLength, transformDestructuringAssignment } from "./destructuring-assignments";
import { isMultiReturnCall } from "../language-extensions/multi";
import { notAllowedOptionalAssignment } from "../../utils/diagnostics";
import { transformElementAccessArgument } from "../access";

export function transformAssignmentLeftHandSideExpression(
    context: TransformationContext,
    node: ts.Expression
): lua.AssignmentLeftHandSideExpression {
    const symbol = context.checker.getSymbolAtLocation(node);
    const left = context.transformExpression(node);

    return lua.isIdentifier(left) && symbol && isSymbolExported(context, symbol)
        ? createExportedIdentifier(context, left)
        : cast(left, lua.isAssignmentLeftHandSideExpression);
}

function transformAssignmentLeftHandSideExpressionWithRightPrecedingStatements(
    context: TransformationContext,
    expression: ts.Expression
) {
    // Cache index expression in a temp so it can be evaluated before right's preceding statements
    if (ts.isElementAccessExpression(expression) && !ts.isLiteralExpression(expression.argumentExpression)) {
        let table = context.transformExpression(expression.expression);

        // If table is complex, it could reference things from the index expression and needs to be cached as well
        if (!ts.isIdentifier(expression.expression)) {
            const tableTemp = context.createTempForNode(expression.expression);
            context.addPrecedingStatements([
                lua.createVariableDeclarationStatement(tableTemp, table, expression.expression),
            ]);
            table = lua.cloneIdentifier(tableTemp);
        }

        const indexNode = expression.argumentExpression;
        const indexTemp = context.createTempForNode(indexNode);
        const index = transformElementAccessArgument(context, expression);
        context.addPrecedingStatements([lua.createVariableDeclarationStatement(indexTemp, index, indexNode)]);
        return lua.createTableIndexExpression(table, lua.cloneIdentifier(indexTemp), expression);
    }
    return transformAssignmentLeftHandSideExpression(context, expression);
}

export function transformAssignment(
    context: TransformationContext,
    // TODO: Change type to ts.LeftHandSideExpression?
    lhs: ts.Expression,
    right: lua.Expression,
    rightPrecedingStatements?: lua.Statement[],
    parent?: ts.Expression
): lua.Statement[] {
    if (ts.isOptionalChain(lhs)) {
        context.diagnostics.push(notAllowedOptionalAssignment(lhs));
        return [];
    }

    if (isArrayLength(context, lhs)) {
        const arrayLengthAssignment = lua.createExpressionStatement(
            transformLuaLibFunction(
                context,
                LuaLibFeature.ArraySetLength,
                parent,
                context.transformExpression(lhs.expression),
                right
            )
        );

        return [arrayLengthAssignment];
    }

    const symbol = ts.isShorthandPropertyAssignment(lhs.parent)
        ? context.checker.getShorthandAssignmentValueSymbol(lhs.parent)
        : context.checker.getSymbolAtLocation(lhs);

    const dependentSymbols = symbol ? getDependenciesOfSymbol(context, symbol) : [];

    const left =
        rightPrecedingStatements && rightPrecedingStatements.length > 0
            ? transformAssignmentLeftHandSideExpressionWithRightPrecedingStatements(context, lhs)
            : transformAssignmentLeftHandSideExpression(context, lhs);

    const rootAssignment = lua.createAssignmentStatement(left, right, lhs.parent);

    return [
        ...(rightPrecedingStatements ?? []),
        rootAssignment,
        ...dependentSymbols.map(symbol => {
            const [left] = rootAssignment.left;
            const identifierToAssign = createExportedIdentifier(context, lua.createIdentifier(symbol.name));
            return lua.createAssignmentStatement(identifierToAssign, left);
        }),
    ];
}

function transformDestructuredAssignmentExpression(
    context: TransformationContext,
    expression: ts.DestructuringAssignment
) {
    const rootIdentifier = context.createTempForNode(expression.right);

    let right = context.transformExpression(expression.right);
    if (isMultiReturnCall(context, expression.right)) {
        right = wrapInTable(right);
    }

    const statements = [
        lua.createVariableDeclarationStatement(rootIdentifier, right),
        ...transformDestructuringAssignment(context, expression, rootIdentifier),
    ];

    return { statements, result: rootIdentifier };
}

export function transformAssignmentExpression(
    context: TransformationContext,
    expression: ts.AssignmentExpression<ts.EqualsToken>
): lua.Expression {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    validateAssignment(context, expression.right, rightType, leftType);

    if (isArrayLength(context, expression.left)) {
        // array.length = x
        return transformLuaLibFunction(
            context,
            LuaLibFeature.ArraySetLength,
            expression,
            context.transformExpression(expression.left.expression),
            context.transformExpression(expression.right)
        );
    }

    if (isDestructuringAssignment(expression)) {
        const { statements, result } = transformDestructuredAssignmentExpression(context, expression);
        context.addPrecedingStatements(statements);
        return result;
    }

    if (ts.isPropertyAccessExpression(expression.left) || ts.isElementAccessExpression(expression.left)) {
        const tempVar = context.createTempForNode(expression.right);
        context.pushPrecedingStatements();
        const right = context.transformExpression(expression.right);
        const precedingStatements = context.popPrecedingStatements();

        const left =
            precedingStatements.length > 0
                ? transformAssignmentLeftHandSideExpressionWithRightPrecedingStatements(context, expression.left)
                : transformAssignmentLeftHandSideExpression(context, expression.left);

        context.addPrecedingStatements([
            ...precedingStatements,
            lua.createVariableDeclarationStatement(tempVar, right, expression.right),
            lua.createAssignmentStatement(left, lua.cloneIdentifier(tempVar), expression.left),
        ]);
        return lua.cloneIdentifier(tempVar);
    } else {
        // Simple assignment
        // ${left} = ${right}; return ${left}
        const left = context.transformExpression(expression.left);
        const right = context.transformExpression(expression.right);
        context.addPrecedingStatements(transformAssignment(context, expression.left, right));
        return left;
    }
}

const canBeTransformedToLuaAssignmentStatement = (
    context: TransformationContext,
    node: ts.DestructuringAssignment
): node is ts.ArrayDestructuringAssignment =>
    ts.isArrayLiteralExpression(node.left) &&
    node.left.elements.every(element => {
        if (isArrayLength(context, element)) {
            return false;
        }

        if (ts.isPropertyAccessExpression(element) || ts.isElementAccessExpression(element)) {
            return true;
        }

        if (ts.isIdentifier(element)) {
            const symbol = context.checker.getSymbolAtLocation(element);
            if (symbol) {
                const aliases = getDependenciesOfSymbol(context, symbol);
                return aliases.length === 0;
            }
        }
    });

export function transformAssignmentStatement(
    context: TransformationContext,
    expression: ts.AssignmentExpression<ts.EqualsToken>
): lua.Statement[] {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    validateAssignment(context, expression.right, rightType, leftType);

    if (isDestructuringAssignment(expression)) {
        if (canBeTransformedToLuaAssignmentStatement(context, expression)) {
            const rightType = context.checker.getTypeAtLocation(expression.right);
            let right: lua.Expression | lua.Expression[] = context.transformExpression(expression.right);

            if (ts.isArrayLiteralExpression(expression.right)) {
                right = expression.right.elements.map(e => context.transformExpression(e));
            } else if (!isMultiReturnCall(context, expression.right) && isArrayType(context, rightType)) {
                right = createUnpackCall(context, right, expression.right);
            }

            const left = expression.left.elements.map(e => transformAssignmentLeftHandSideExpression(context, e));

            return [lua.createAssignmentStatement(left, right, expression)];
        }

        let right = context.transformExpression(expression.right);
        if (isMultiReturnCall(context, expression.right)) {
            right = wrapInTable(right);
        }

        const rootIdentifier = lua.createAnonymousIdentifier(expression.left);
        return [
            lua.createVariableDeclarationStatement(rootIdentifier, right),
            ...transformDestructuringAssignment(context, expression, rootIdentifier),
        ];
    } else {
        context.pushPrecedingStatements();
        const right = context.transformExpression(expression.right);
        const precedingStatements = context.popPrecedingStatements();
        return transformAssignment(context, expression.left, right, precedingStatements);
    }
}
