import { LuaTranspiler, TranspileError } from "../Transpiler";
import { TSHelper as tsHelper } from "../TSHelper";

import * as ts from "typescript";

export class LuaTranspiler51 extends LuaTranspiler {
    /** @override */
    public transpileVariableDestructuring(value: string): string {
        return `unpack(${value})`;
    }
}
