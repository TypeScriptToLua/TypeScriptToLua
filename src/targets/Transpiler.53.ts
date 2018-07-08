import { TranspileError } from "../Transpiler";
import { TSHelper as tsHelper } from "../TSHelper";
import { LuaTranspiler52 } from "./Transpiler.52";

import * as ts from "typescript";

export class LuaTranspiler53 extends LuaTranspiler52 {
    /** @override */
    public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
                return `${lhs} & ${rhs}`;
            case ts.SyntaxKind.BarToken:
                return `${lhs} | ${rhs}`;
            case ts.SyntaxKind.CaretToken:
                return `${lhs} ~ ${rhs}`;
            case ts.SyntaxKind.LessThanLessThanToken:
                return `${lhs} << ${rhs}`;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return `${lhs} >> ${rhs}`;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                throw new TranspileError("Bitwise operator >>> not supported in Lua 5.3", node);
        }
    }

    /** @override */
    public getValidStringProperties(): { [js: string]: string } {
        return {
            fromCharCode: "string.char",
            fromCodePoint: "utf8.char",
        };
    }
}
