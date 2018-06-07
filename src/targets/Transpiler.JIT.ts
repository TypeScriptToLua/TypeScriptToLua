import { LuaTranspiler } from "../Transpiler";
import { TSHelper as tsHelper } from "../TSHelper";

import * as ts from "typescript";

export class LuaTranspilerJIT extends LuaTranspiler {
    public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
                return `bit.band(${lhs},${rhs})`;
            case ts.SyntaxKind.AmpersandEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression,
                                                     `bit.band(${lhs},${rhs})`);
                }
                return `${lhs}=bit.band(${lhs},${rhs})`;
            case ts.SyntaxKind.BarToken:
                return `bit.bor(${lhs},${rhs})`;
            case ts.SyntaxKind.BarEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression,
                                                     `bit.bor(${lhs},${rhs})`);
                }
                return `${lhs}=bit.bor(${lhs},${rhs})`;
            case ts.SyntaxKind.LessThanLessThanToken:
                return `bit.lshift(${lhs},${rhs})`;
            case ts.SyntaxKind.LessThanLessThanEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression,
                                                     `bit.lshift(${lhs},${rhs})`);
                }
                return `${lhs}=bit.lshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return `bit.arshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression,
                                                     `bit.arshift(${lhs},${rhs})`);
                }
                return `${lhs}=bit.arshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return `bit.rshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression,
                                                     `bit.rshift(${lhs},${rhs})`);
                }
                return `${lhs}=bit.rshift(${lhs},${rhs})`;
        }
    }
}
