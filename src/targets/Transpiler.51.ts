import { LuaTranspiler } from "../Transpiler";
import { TSHelper as tsHelper } from "../TSHelper";

import * as ts from "typescript";

export class LuaTranspiler51 extends LuaTranspiler {
    /** @override */
    public transpileDestructingAssignmentValue(node: ts.Expression): string {
        return `unpack(${this.transpileExpression(node)})`;
    }
}
