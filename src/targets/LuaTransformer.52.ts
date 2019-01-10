import * as ts from "typescript";

import * as tstl from "../LuaAST";
import {ExpressionVisitResult, StatementVisitResult, ScopeType} from "../LuaTransformer";
import {TSHelper as tsHelper} from "../TSHelper";
import { LuaTransformer51 } from "./LuaTransformer.51";

export class LuaTransformer52 extends LuaTransformer51
{
    /** @override */
    public transformLoopBody(
        loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement
    ): tstl.Statement[]
    {
        this.pushScope(ScopeType.Loop);
        const baseResult: tstl.Statement[] = [tstl.createDoStatement(super.transformLoopBody(loop))];
        const scopeId = this.popScope().id;

        const continueLabel = tstl.createLabelStatement(`__continue${scopeId}`);
        baseResult.push(continueLabel);

        return baseResult;
    }

    /** @override */
    public transformContinueStatement(statement: ts.ContinueStatement): StatementVisitResult {
        return tstl.createGotoStatement(
            `__continue${this.peekScope().id}`,
            undefined,
            statement
        );
    }

    /** @override */
    public createUnpackCall(expression: tstl.Expression): tstl.Expression {
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("unpack")),
            [expression]);
    }

    // /** @override */
    // public transpileBreak(node: ts.BreakStatement): string {
    //     const topScope = this.peekSpecialScope();

    //     if (topScope.type === ScopeType.Switch) {
    //         return this.indent + `goto ____switch${topScope.id}_end\n`;
    //     } else {
    //         return super.transpileBreak(node);
    //     }
    // }

    /** @override */
    public transformUnaryBitOperation(
        node: ts.Node,
        expression: tstl.Expression,
        operator: tstl.UnaryBitwiseOperator
    ): ExpressionVisitResult {
        return tstl.createUnaryExpression(expression, operator, undefined, node);
    }

    /** @override */
    public transformBinaryBitOperation(
        node: ts.Node,
        left: tstl.Expression,
        right: tstl.Expression,
        operator: tstl.BinaryBitwiseOperator
    ): ExpressionVisitResult {
        return tstl.createBinaryExpression(left, right, operator, undefined, node);
    }

    // /** @override */
    // public transpileSwitch(node: ts.SwitchStatement): string {
    //     const expression = this.transpileExpression(node.expression, true);
    //     const clauses = node.caseBlock.clauses;

    //     let result = this.indent + "-------Switch statement start-------\n";

    //     const switchVarName = "____switch" + this.genVarCounter;
    //     this.pushSpecialScope(ScopeType.Switch);

    //     result += this.indent + `local ${switchVarName} = ${expression}\n`;

    //     let hasDefaultClause = false;

    //     // If statement to go to right entry label
    //     clauses.forEach((clause, index) => {
    //         if (ts.isCaseClause(clause)) {
    //             result += this.indent +
    //                         `if ${this.transpileExpression(clause.expression, true)} == ${switchVarName} then\n`;

    //             this.pushIndent();
    //             result += this.indent + `goto ${switchVarName}_case_${index}\n`;
    //             this.popIndent();

    //             result += this.indent + "end\n";
    //         } else if (ts.isDefaultClause(clause)) {
    //             hasDefaultClause = true;
    //         }
    //     });

    //     result += "\n";

    //     // If no case condition is matched jump to end or default immediately
    //     if (hasDefaultClause) {
    //         result += this.indent + `goto ${switchVarName}_default\n`;
    //     } else {
    //         result += this.indent + `goto ${switchVarName}_end\n`;
    //     }

    //     result += "\n";

    //     const transpileClauseBody = (clause: ts.CaseOrDefaultClause) => {
    //         result += this.indent + "do\n";
    //         this.pushIndent();
    //         result += this.transpileBlock(ts.createBlock(clause.statements));
    //         this.popIndent();
    //         result += this.indent + "end\n";
    //     };

    //     clauses.forEach((clause, index) => {
    //         if (ts.isCaseClause(clause)) {
    //             result += this.indent + `::${switchVarName}_case_${index}::\n`;

    //             transpileClauseBody(clause);
    //         } else if (ts.isDefaultClause(clause)) {
    //             result += this.indent + `::${switchVarName}_default::\n`;

    //             transpileClauseBody(clause);
    //         }
    //     });

    //     result += this.indent + `::${switchVarName}_end::\n`;
    //     result += this.indent + "-------Switch statement end-------\n";

    //     this.popSpecialScope();

    //     return result;
    // }

    // /** @override */
    // public transpileDestructingAssignmentValue(node: ts.Expression): string {
    //     return `table.unpack(${this.transpileExpression(node)})`;
    // }
}
