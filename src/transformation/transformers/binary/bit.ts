import * as ts from "typescript";
import { LuaTarget } from "../../../CompilerOptions";
import * as tstl from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { UnsupportedForTarget, UnsupportedKind } from "../../utils/errors";
import { transformBinaryOperator } from "../binary";

type BitOperator = ts.ShiftOperator | ts.BitwiseOperator;
function transformBinaryBitLibOperation(
    node: ts.Node,
    left: tstl.Expression,
    right: tstl.Expression,
    operator: BitOperator,
    lib: string
): tstl.Expression {
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

    return tstl.createCallExpression(
        tstl.createTableIndexExpression(tstl.createIdentifier(lib), tstl.createStringLiteral(bitFunction)),
        [left, right],
        node
    );
}

export function transformBinaryBitOperation(
    context: TransformationContext,
    node: ts.Node,
    left: tstl.Expression,
    right: tstl.Expression,
    operator: BitOperator
): tstl.Expression {
    switch (context.luaTarget) {
        case LuaTarget.Lua51:
            throw UnsupportedForTarget("Bitwise operations", LuaTarget.Lua51, node);

        case LuaTarget.Lua52:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit32");

        case LuaTarget.LuaJIT:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit");

        default:
            const luaOperator = transformBinaryOperator(context, node, operator);
            return tstl.createBinaryExpression(left, right, luaOperator, node);
    }
}

function transformUnaryBitLibOperation(
    node: ts.Node,
    expression: tstl.Expression,
    operator: tstl.UnaryBitwiseOperator,
    lib: string
): tstl.Expression {
    let bitFunction: string;
    switch (operator) {
        case tstl.SyntaxKind.BitwiseNotOperator:
            bitFunction = "bnot";
            break;
        default:
            throw UnsupportedKind("unary bitwise operator", operator, node);
    }

    return tstl.createCallExpression(
        tstl.createTableIndexExpression(tstl.createIdentifier(lib), tstl.createStringLiteral(bitFunction)),
        [expression],
        node
    );
}

export function transformUnaryBitOperation(
    context: TransformationContext,
    node: ts.Node,
    expression: tstl.Expression,
    operator: tstl.UnaryBitwiseOperator
): tstl.Expression {
    switch (context.luaTarget) {
        case LuaTarget.Lua51:
            throw UnsupportedForTarget("Bitwise operations", LuaTarget.Lua51, node);

        case LuaTarget.Lua52:
            return transformUnaryBitLibOperation(node, expression, operator, "bit32");

        case LuaTarget.LuaJIT:
            return transformUnaryBitLibOperation(node, expression, operator, "bit");

        default:
            return tstl.createUnaryExpression(expression, operator, node);
    }
}
