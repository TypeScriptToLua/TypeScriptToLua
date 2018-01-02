import * as ts from "typescript";

import {TSHelper as tsEx} from "./TSHelper";
import {LuaTranspiler, TranspileError} from "./Transpiler";

export class ForHelper {

    // Get the ending value of a numeric for loop
    static GetForEnd(condition: ts.Expression, transpiler: LuaTranspiler): string {
        if (ts.isBinaryExpression(condition)) {
            if (ts.isIdentifier(condition.left)) {
                // Account for lua 1 indexing
                switch (condition.operatorToken.kind) {
                    case ts.SyntaxKind.LessThanEqualsToken:
                    case ts.SyntaxKind.GreaterThanEqualsToken:
                        return transpiler.transpileExpression(condition.right);
                    case ts.SyntaxKind.LessThanToken:
                        return transpiler.transpileExpression(condition.right) + "-1";
                    case ts.SyntaxKind.GreaterThanToken:
                        return transpiler.transpileExpression(condition.right) + "+1";
                    default:
                        throw new TranspileError("Unsupported for-loop condition operator: " + tsEx.enumName(condition.operatorToken, ts.SyntaxKind), condition);
                }
            } else {
                // Account for lua 1 indexing
                switch (condition.operatorToken.kind) {
                    case ts.SyntaxKind.LessThanEqualsToken:
                    case ts.SyntaxKind.GreaterThanEqualsToken:
                        return transpiler.transpileExpression(condition.right);
                    case ts.SyntaxKind.LessThanToken:
                        return transpiler.transpileExpression(condition.right) + "+1";
                    case ts.SyntaxKind.GreaterThanToken:
                        return transpiler.transpileExpression(condition.right) + "-1";
                    default:
                        throw new TranspileError("Unsupported for-loop condition operator: " + tsEx.enumName(condition.operatorToken, ts.SyntaxKind), condition);
                }
            }
        } else {
            throw new TranspileError("Unsupported for-loop condition type: " + tsEx.enumName(condition.kind, ts.SyntaxKind), condition);
        }
    }

    // Get increment step for numeric for loop
    static GetForStep(incrementor: ts.Expression, transpiler: LuaTranspiler): string {
        switch (incrementor.kind) {
            case ts.SyntaxKind.PostfixUnaryExpression:
            case ts.SyntaxKind.PrefixUnaryExpression:
                switch ((<ts.PostfixUnaryExpression|ts.PrefixUnaryExpression>incrementor).operator) {
                    case ts.SyntaxKind.PlusPlusToken:
                        return "1";
                    case ts.SyntaxKind.MinusMinusToken:
                        return "-1";
                    default:
                        throw new TranspileError("Unsupported for-loop increment step: " + tsEx.enumName(incrementor.kind, ts.SyntaxKind), incrementor);
                }
            case ts.SyntaxKind.BinaryExpression:
                let value = ts.isIdentifier((<ts.BinaryExpression>incrementor).left) ? 
                    transpiler.transpileExpression((<ts.BinaryExpression>incrementor).right) :
                    transpiler.transpileExpression((<ts.BinaryExpression>incrementor).left);
                switch((<ts.BinaryExpression>incrementor).operatorToken.kind) {
                    case ts.SyntaxKind.PlusEqualsToken:
                        return value;
                    case ts.SyntaxKind.MinusEqualsToken:
                        return "-" + value;
                    default:
                        throw new TranspileError("Unsupported for-loop increment step: " + tsEx.enumName(incrementor.kind, ts.SyntaxKind), incrementor);
                }
            default:
                throw new TranspileError("Unsupported for-loop increment step: " + tsEx.enumName(incrementor.kind, ts.SyntaxKind), incrementor);
        }
    }
}