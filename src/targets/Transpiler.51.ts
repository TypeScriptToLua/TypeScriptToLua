import { LuaTranspiler, TranspileError } from "../Transpiler";
import { TSHelper as tsHelper } from "../TSHelper";

import * as ts from "typescript";

export class LuaTranspiler51 extends LuaTranspiler {
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
        return result;
    }

    public transpileContinue(): string {
      throw new TranspileError(
        "Unsupported continue statement, " +
        "continue is not supported in Lua ${this.options.luaTarget}.",
        null
      );
    }
}
