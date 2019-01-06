import * as ts from "typescript";

import {LuaTransformer} from "../LuaTransformer";
import {TSHelper as tsHelper} from "../TSHelper";
import { LuaTransformer52 } from "./LuaTransformer.52";

export class LuaTransformer53 extends LuaTransformer52 {
    // TODO
    // /** @override */
    // public transpileUnaryBitOperation(node: ts.PrefixUnaryExpression, operand: string): string {
    //     switch (node.operator) {
    //         case ts.SyntaxKind.TildeToken:
    //             return `~${operand}`;
    //         default:
    //             throw TSTLErrors.UnsupportedKind("bitwise operator", node.operator, node);
    //     }
    // }

    // /** @override */
    // public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
    //     switch (node.operatorToken.kind) {
    //         case ts.SyntaxKind.AmpersandToken:
    //             return `${lhs} & ${rhs}`;
    //         case ts.SyntaxKind.BarToken:
    //             return `${lhs} | ${rhs}`;
    //         case ts.SyntaxKind.CaretToken:
    //             return `${lhs} ~ ${rhs}`;
    //         case ts.SyntaxKind.LessThanLessThanToken:
    //             return `${lhs} << ${rhs}`;
    //         case ts.SyntaxKind.GreaterThanGreaterThanToken:
    //             return `${lhs} >> ${rhs}`;
    //         case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
    //             throw TSTLErrors.UnsupportedForTarget("Bitwise >>> operator", this.options.luaTarget, node);
    //         default:
    //             throw TSTLErrors.UnsupportedKind("bitwise operator", node.operatorToken.kind, node);
    //     }
    // }

    // /** @override */
    // public getValidStringProperties(): { [js: string]: string } {
    //     return {
    //         fromCharCode: "string.char",
    //         fromCodePoint: "utf8.char",
    //     };
    // }
}
