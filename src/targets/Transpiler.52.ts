import { TSHelper as tsHelper } from "../TSHelper";
import { LuaTranspiler51 } from "./Transpiler.51";

import * as ts from "typescript";

export class LuaTranspiler52 extends LuaTranspiler51 {
    /** @override */
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

    /** @override */
    public transpileContinue(node: ts.ContinueStatement): string {
        return this.indent + `goto __continue${this.loopStack[this.loopStack.length - 1]}\n`;
    }

    /** @override */
    public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
                return `bit32.band(${lhs},${rhs})`;
            case ts.SyntaxKind.BarToken:
                return `bit32.bor(${lhs},${rhs})`;
            case ts.SyntaxKind.CaretToken:
                return `bit32.bxor(${lhs},${rhs})`;
            case ts.SyntaxKind.LessThanLessThanToken:
                return `bit32.lshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return `bit32.rshift(${lhs},${rhs})`;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return `bit32.arshift(${lhs},${rhs})`;
        }
    }
}
