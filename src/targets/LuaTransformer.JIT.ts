import * as ts from "typescript";

import * as tstl from "../LuaAST";
import {LuaTransformer} from "../LuaTransformer";
import {TSHelper as tsHelper} from "../TSHelper";
import { LuaTransformer52 } from "./LuaTransformer.52";

export class LuaTransformerJIT extends LuaTransformer52 {
    /** @override */
    public createUnpackCall(expression: tstl.Expression): tstl.Expression {
        return tstl.createCallExpression(tstl.createIdentifier("unpack"), [expression]);
    }

    // TODO
    // /** @override */
    // public transpileUnaryBitOperation(node: ts.PrefixUnaryExpression, operand: string): string {
    //     switch (node.operator) {
    //         case ts.SyntaxKind.TildeToken:
    //             return `bit.bnot(${operand})`;
    //         default:
    //             throw TSTLErrors.UnsupportedKind("bitwise operator", node.operator, node);
    //     }
    // }

    // /** @override */
    // public transpileDestructingAssignmentValue(node: ts.Expression): string {
    //     return `unpack(${this.transpileExpression(node)})`;
    // }
}
