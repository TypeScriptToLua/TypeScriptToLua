import * as ts from "typescript";

import * as tstl from "../LuaAST";
import {ExpressionVisitResult} from "../LuaTransformer";
import {TSHelper as tsHelper} from "../TSHelper";
import { LuaTransformer52 } from "./LuaTransformer.52";
import {TSTLErrors} from "../TSTLErrors";

export class LuaTransformer53 extends LuaTransformer52 {
    // TODO

    /** @override */
    public transformBinaryBitOperation(
        expression: ts.Node,
        left: tstl.Expression,
        right: tstl.Expression,
        operator: tstl.BinaryBitwiseOperator
    ): ExpressionVisitResult {
        if (operator === tstl.SyntaxKind.BitwiseArithmaticRightShift) {
            throw TSTLErrors.UnsupportedForTarget("Bitwise >>> operator", this.options.luaTarget, expression);
        }
        return tstl.createBinaryExpression(left, right, operator, undefined, expression);
    }

    // /** @override */
    // public getValidStringProperties(): { [js: string]: string } {
    //     return {
    //         fromCharCode: "string.char",
    //         fromCodePoint: "utf8.char",
    //     };
    // }
}
