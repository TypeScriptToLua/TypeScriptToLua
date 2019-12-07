import * as ts from "typescript";
import { LuaTarget } from "../../../CompilerOptions";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { UnsupportedForTarget, UnsupportedKind } from "../../utils/errors";
import { transformBinaryOperator } from "../binary-expression";

type BitOperator = ts.ShiftOperator | ts.BitwiseOperator;
function transformBinaryBitLibOperation(
    node: ts.Node,
    left: lua.Expression,
    right: lua.Expression,
    operator: BitOperator,
    lib: string
): lua.Expression {
    let bitFunction: string;
    switch (operator) {
        case ts.SyntaxKind.AmpersandToken:
            bitFunction = "band";
            break;
        case ts.SyntaxKind.BarToken:
            bitFunction = "bor";
            break;
        case ts.SyntaxKind.CaretToken:
            bitFunction = "bxor";
            break;
        case ts.SyntaxKind.LessThanLessThanToken:
            bitFunction = "lshift";
            break;
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            bitFunction = "rshift";
            break;
        case ts.SyntaxKind.GreaterThanGreaterThanToken:
            bitFunction = "arshift";
            break;
        default:
            throw UnsupportedKind("binary bitwise operator", operator, node);
    }

    return lua.createCallExpression(
        lua.createTableIndexExpression(lua.createIdentifier(lib), lua.createStringLiteral(bitFunction)),
        [left, right],
        node
    );
}

export function transformBinaryBitOperation(
    context: TransformationContext,
    node: ts.Node,
    left: lua.Expression,
    right: lua.Expression,
    operator: BitOperator
): lua.Expression {
    switch (context.luaTarget) {
        case LuaTarget.Lua51:
            throw UnsupportedForTarget("Bitwise operations", LuaTarget.Lua51, node);

        case LuaTarget.Lua52:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit32");

        case LuaTarget.LuaJIT:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit");

        default:
            const luaOperator = transformBinaryOperator(context, node, operator);
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
            throw UnsupportedKind("unary bitwise operator", operator, node);
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
        case LuaTarget.Lua51:
            throw UnsupportedForTarget("Bitwise operations", LuaTarget.Lua51, node);

        case LuaTarget.Lua52:
            return transformUnaryBitLibOperation(node, expression, operator, "bit32");

        case LuaTarget.LuaJIT:
            return transformUnaryBitLibOperation(node, expression, operator, "bit");

        default:
            return lua.createUnaryExpression(expression, operator, node);
    }
}
