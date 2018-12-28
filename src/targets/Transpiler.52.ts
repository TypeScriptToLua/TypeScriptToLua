import { TSTLErrors } from "../Errors";
import { ScopeType } from "../Transpiler";
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
        this.pushSpecialScope(ScopeType.Loop);
        let result = super.transpileLoopBody(node);
        result += this.indent + `::__continue${this.popSpecialScope().id}::\n`;
        return result;
    }

    /** @override */
    public transpileContinue(node: ts.ContinueStatement): string {
        return this.indent + `goto __continue${this.peekSpecialScope().id}\n`;
    }

    /** @override */
    public transpileBreak(node: ts.BreakStatement): string {
        const topScope = this.peekSpecialScope();

        if (topScope.type === ScopeType.Switch) {
            return this.indent + `goto ____switch${topScope.id}_end\n`;
        } else {
            return super.transpileBreak(node);
        }
    }

    /** @override */
    public transpileUnaryBitOperation(node: ts.PrefixUnaryExpression, operand: string): string {
        switch (node.operator) {
            case ts.SyntaxKind.TildeToken:
                return `bit32.bnot(${operand})`;
            default:
                throw TSTLErrors.UnsupportedKind("bitwise operator", node.operator, node);
        }
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
            default:
                throw TSTLErrors.UnsupportedKind("bitwise operator", node.operatorToken.kind, node);
        }
    }

    /** @override */
    public transpileSwitch(node: ts.SwitchStatement): string {
        const expression = this.transpileExpression(node.expression, true);
        const clauses = node.caseBlock.clauses;

        let result = this.indent + "-------Switch statement start-------\n";

        const switchVarName = "____switch" + this.genVarCounter;
        this.pushSpecialScope(ScopeType.Switch);

        result += this.indent + `local ${switchVarName} = ${expression}\n`;

        let hasDefaultClause = false;

        // If statement to go to right entry label
        clauses.forEach((clause, index) => {
            if (ts.isCaseClause(clause)) {
                result += this.indent +
                          `if ${this.transpileExpression(clause.expression, true)} == ${switchVarName} then\n`;

                this.pushIndent();
                result += this.indent + `goto ${switchVarName}_case_${index}\n`;
                this.popIndent();

                result += this.indent + "end\n";
            } else if (ts.isDefaultClause(clause)) {
                hasDefaultClause = true;
            }
        });

        result += "\n";

        // If no case condition is matched jump to end or default immediately
        if (hasDefaultClause) {
            result += this.indent + `goto ${switchVarName}_default\n`;
        } else {
            result += this.indent + `goto ${switchVarName}_end\n`;
        }

        result += "\n";

        const transpileClauseBody = (clause: ts.CaseOrDefaultClause) => {
            result += this.indent + "do\n";
            this.pushIndent();
            result += this.transpileBlock(ts.createBlock(clause.statements));
            this.popIndent();
            result += this.indent + "end\n";
        };

        clauses.forEach((clause, index) => {
            if (ts.isCaseClause(clause)) {
                result += this.indent + `::${switchVarName}_case_${index}::\n`;

                transpileClauseBody(clause);
            } else if (ts.isDefaultClause(clause)) {
                result += this.indent + `::${switchVarName}_default::\n`;

                transpileClauseBody(clause);
            }
        });

        result += this.indent + `::${switchVarName}_end::\n`;
        result += this.indent + "-------Switch statement end-------\n";

        this.popSpecialScope();

        return result;
    }

    /** @override */
    public transpileDestructingAssignmentValue(node: ts.Expression): string {
        return `table.unpack(${this.transpileExpression(node)})`;
    }

    /** @override */
    public transpileSpreadElement(node: ts.SpreadElement): string {
      return "table.unpack(" + this.transpileExpression(node.expression) + ")";
    }
}
