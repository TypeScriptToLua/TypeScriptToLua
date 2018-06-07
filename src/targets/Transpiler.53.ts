import { TranspileError } from "../Transpiler";
import { TSHelper as tsHelper } from "../TSHelper";
import { LuaTranspiler52 } from "./Transpiler.52";

import * as ts from "typescript";

export class LuaTranspiler53 extends LuaTranspiler52 {
    public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
                return `${lhs}&${rhs}`;
            case ts.SyntaxKind.AmpersandEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression, `${lhs}&${rhs}`);
                }
                return `${lhs}=${lhs}&${rhs}`;
            case ts.SyntaxKind.BarToken:
                return `${lhs}|${rhs}`;
            case ts.SyntaxKind.BarEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression, `${lhs}|${rhs}`);
                }
                return `${lhs}=${lhs}|${rhs}`;
            case ts.SyntaxKind.LessThanLessThanToken:
                return `${lhs}<<${rhs}`;
            case ts.SyntaxKind.LessThanLessThanEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression, `${lhs}<<${rhs}`);
                }
                return `${lhs}=${lhs}<<${rhs}`;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return `${lhs}>>${rhs}`;
            case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
                if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                    return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression, `${lhs}>>${rhs}`);
                }
                return `${lhs}=${lhs}>>${rhs}`;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                throw new TranspileError("Bitwise operator >>> not supported in Lua 5.3", node);
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                throw new TranspileError("Bitwise operator >>> not supported in Lua 5.3", node);
        }
    }
    public getValidStringProperties(): {[js: string]: string} {
        return {
            fromCharCode: "string.char",
            fromCodePoint: "utf8.char",
        };
    }

}
