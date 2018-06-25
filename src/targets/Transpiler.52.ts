import { TSHelper as tsHelper } from "../TSHelper";
import { LuaTranspiler51 } from "./Transpiler.51";

import * as ts from "typescript";

export class LuaTranspiler52 extends LuaTranspiler51 {
    public transpileLoopBody(
        node: ts.WhileStatement
            | ts.DoStatement
            | ts.ForStatement
            | ts.ForOfStatement
            | ts.ForInStatement
    ): string {
        this.loopStack.push(this.genVarCounter);
        this.genVarCounter++;
        let result = this.indent + "do\n";
        this.pushIndent();
        result += this.transpileStatement(node.statement);
        this.popIndent();
        result += this.indent + "end\n";
        result += this.indent + `::__continue${this.loopStack.pop()}::\n`;
        return result;
    }

    public transpileContinue(node: ts.ContinueStatement): string {
        return this.indent + `goto __continue${this.loopStack[this.loopStack.length - 1]}\n`;
    }
}
