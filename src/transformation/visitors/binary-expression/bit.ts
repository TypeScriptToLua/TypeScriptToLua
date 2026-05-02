import * as ts from "typescript";
import { LuaTarget } from "../../../CompilerOptions";
import * as lua from "../../../LuaAST";
import { assertNever } from "../../../utils";
import { TransformationContext } from "../../context";
import { unsupportedForTarget } from "../../utils/diagnostics";

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

type NonShiftRightBitOperator = Exclude<
    BitOperator,
    ts.SyntaxKind.GreaterThanGreaterThanToken | ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken
>;

function transformBitOperatorToLuaOperator(operator: NonShiftRightBitOperator): lua.BinaryOperator {
    switch (operator) {
        case ts.SyntaxKind.BarToken:
            return lua.SyntaxKind.BitwiseOrOperator;
        case ts.SyntaxKind.CaretToken:
            return lua.SyntaxKind.BitwiseExclusiveOrOperator;
        case ts.SyntaxKind.AmpersandToken:
            return lua.SyntaxKind.BitwiseAndOperator;
        case ts.SyntaxKind.LessThanLessThanToken:
            return lua.SyntaxKind.BitwiseLeftShiftOperator;
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
        case LuaTarget.Lua50:
        case LuaTarget.Lua51:
            context.diagnostics.push(unsupportedForTarget(node, "Bitwise operations", context.luaTarget));
            return transformBinaryBitLibOperation(node, left, right, operator, "bit");

        case LuaTarget.LuaJIT:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit");

        case LuaTarget.Lua52:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit32");
        default:
            // TS `>>>` is logical on int32; Lua 5.3+ `>>` is logical on 64-bit. Mask to 32 bits first.
            if (operator === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken) {
                const mask = lua.createBinaryExpression(
                    left,
                    lua.createNumericLiteral(0xffffffff, node),
                    lua.SyntaxKind.BitwiseAndOperator,
                    node
                );
                return lua.createBinaryExpression(
                    lua.createParenthesizedExpression(mask, node),
                    right,
                    lua.SyntaxKind.BitwiseRightShiftOperator,
                    node
                );
            }
            // TS `>>` is arithmetic on int32; Lua 5.3+ has no native equivalent. Sign-extend the
            // low 32 bits to a 64-bit signed value, then floor-divide by 2^right.
            if (operator === ts.SyntaxKind.GreaterThanGreaterThanToken) {
                const masked = lua.createBinaryExpression(
                    left,
                    lua.createNumericLiteral(0xffffffff, node),
                    lua.SyntaxKind.BitwiseAndOperator,
                    node
                );
                const xored = lua.createBinaryExpression(
                    lua.createParenthesizedExpression(masked, node),
                    lua.createNumericLiteral(0x80000000, node),
                    lua.SyntaxKind.BitwiseExclusiveOrOperator,
                    node
                );
                const signed = lua.createBinaryExpression(
                    lua.createParenthesizedExpression(xored, node),
                    lua.createNumericLiteral(0x80000000, node),
                    lua.SyntaxKind.SubtractionOperator,
                    node
                );
                const divisor = lua.createBinaryExpression(
                    lua.createNumericLiteral(1, node),
                    right,
                    lua.SyntaxKind.BitwiseLeftShiftOperator,
                    node
                );
                return lua.createBinaryExpression(
                    lua.createParenthesizedExpression(signed, node),
                    lua.createParenthesizedExpression(divisor, node),
                    lua.SyntaxKind.FloorDivisionOperator,
                    node
                );
            }
            const luaOperator = transformBitOperatorToLuaOperator(operator);
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
        case LuaTarget.Lua50:
        case LuaTarget.Lua51:
            context.diagnostics.push(unsupportedForTarget(node, "Bitwise operations", context.luaTarget));
            return transformUnaryBitLibOperation(node, expression, operator, "bit");

        case LuaTarget.LuaJIT:
            return transformUnaryBitLibOperation(node, expression, operator, "bit");

        case LuaTarget.Lua52:
            return transformUnaryBitLibOperation(node, expression, operator, "bit32");

        default:
            return lua.createUnaryExpression(expression, operator, node);
    }
}
