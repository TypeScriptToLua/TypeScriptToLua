import { TSTLErrors } from "../Errors";
import { TSHelper as tsHelper } from "../TSHelper";
import { LuaTranspiler52 } from "./Transpiler.52";

import * as ts from "typescript";

export class LuaTranspilerJIT extends LuaTranspiler52 {
    /** @override */
    public transpileUnaryBitOperation(node: ts.PrefixUnaryExpression, operand: string): string {
        switch (node.operator) {
            case ts.SyntaxKind.TildeToken:
                return `bit.bnot(${operand})`;
            default:
                throw TSTLErrors.UnsupportedKind("bitwise operator", node.operator, node);
        }
    }

    /** @override */
    public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
                return `bit.band(${lhs},${rhs})`;
            case ts.SyntaxKind.BarToken:
                return `bit.bor(${lhs},${rhs})`;
            case ts.SyntaxKind.CaretToken:
                return `bit.bxor(${lhs},${rhs})`;
            case ts.SyntaxKind.LessThanLessThanToken:
                return `bit.lshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return `bit.rshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return `bit.arshift(${lhs},${rhs})`;
            default:
                throw TSTLErrors.UnsupportedKind("bitwise operator", node.operatorToken.kind, node);
        }
    }
}
