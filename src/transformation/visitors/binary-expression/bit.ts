import * as ts from "typescript";
import { LuaTarget } from "../../../CompilerOptions";
import * as lua from "../../../LuaAST";
import { assertNever } from "../../../utils";
import { TransformationContext } from "../../context";
import { unsupportedForTarget, unsupportedRightShiftOperator } from "../../utils/diagnostics";

export type BitOperator = ts.ShiftOperator | ts.BitwiseOperator;
export const isBitOperator = (operator: ts.BinaryOperator): operator is BitOperator =>
    operator in bitOperatorToLibOperation;

const bitOperatorToLibOperation: Record<BitOperator, string> = {
    [ts.SyntaxKind.AmpersandToken]: "band",
    [ts.SyntaxKind.BarToken]: "bor",
    [ts.SyntaxKind.CaretToken]: "bxor",
    [ts.SyntaxKind.LessThanLessThanToken]: "lshift",
    [ts.SyntaxKind.GreaterThanGreaterThanToken]: "arshift",
    [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken]: "rshift",
};

function transformBinaryBitLibOperation(
    node: ts.Node,
    left: lua.Expression,
    right: lua.Expression,
    operator: BitOperator,
    lib: string
): lua.Expression {
    const functionName = bitOperatorToLibOperation[operator];
    return lua.createCallExpression(
        lua.createTableIndexExpression(lua.createIdentifier(lib), lua.createStringLiteral(functionName)),
        [left, right],
        node
    );
}

function transformBitOperatorToLuaOperator(
    context: TransformationContext,
    node: ts.Node,
    operator: BitOperator
): lua.BinaryOperator {
    switch (operator) {
        case ts.SyntaxKind.BarToken:
            return lua.SyntaxKind.BitwiseOrOperator;
        case ts.SyntaxKind.CaretToken:
            return lua.SyntaxKind.BitwiseExclusiveOrOperator;
        case ts.SyntaxKind.AmpersandToken:
            return lua.SyntaxKind.BitwiseAndOperator;
        case ts.SyntaxKind.LessThanLessThanToken:
            return lua.SyntaxKind.BitwiseLeftShiftOperator;
        case ts.SyntaxKind.GreaterThanGreaterThanToken:
            context.diagnostics.push(unsupportedRightShiftOperator(node));
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            return lua.SyntaxKind.BitwiseRightShiftOperator;
    }
}

export function transformBinaryBitOperation(
    context: TransformationContext,
    node: ts.Node,
    left: lua.Expression,
    right: lua.Expression,
    operator: BitOperator
): lua.Expression {
    switch (context.luaTarget) {
        case LuaTarget.Universal:
        case LuaTarget.Lua51:
            context.diagnostics.push(unsupportedForTarget(node, "Bitwise operations", LuaTarget.Lua51));

        case LuaTarget.LuaJIT:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit");

        case LuaTarget.Lua52:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit32");
        default:
            const luaOperator = transformBitOperatorToLuaOperator(context, node, operator);
            return lua.createBinaryExpression(left, right, luaOperator, node);
    }
}

function transformUnaryBitLibOperation(
    node: ts.Node,
    expression: lua.Expression,
    operator: lua.UnaryBitwiseOperator,
    lib: string
): lua.Expression {
    let bitFunction: string;
    switch (operator) {
        case lua.SyntaxKind.BitwiseNotOperator:
            bitFunction = "bnot";
            break;
        default:
            assertNever(operator);
    }

    return lua.createCallExpression(
        lua.createTableIndexExpression(lua.createIdentifier(lib), lua.createStringLiteral(bitFunction)),
        [expression],
        node
    );
}

export function transformUnaryBitOperation(
    context: TransformationContext,
    node: ts.Node,
    expression: lua.Expression,
    operator: lua.UnaryBitwiseOperator
): lua.Expression {
    switch (context.luaTarget) {
        case LuaTarget.Universal:
        case LuaTarget.Lua51:
            context.diagnostics.push(unsupportedForTarget(node, "Bitwise operations", LuaTarget.Lua51));

        case LuaTarget.LuaJIT:
            return transformUnaryBitLibOperation(node, expression, operator, "bit");

        case LuaTarget.Lua52:
            return transformUnaryBitLibOperation(node, expression, operator, "bit32");

        default:
            return lua.createUnaryExpression(expression, operator, node);
    }
}
