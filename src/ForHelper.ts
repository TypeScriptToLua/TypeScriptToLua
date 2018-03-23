import * as ts from "typescript";

import {LuaTranspiler, TranspileError} from "./Transpiler";
import {TSHelper as tsEx} from "./TSHelper";

export class ForHelper {

    // Get the ending value of a numeric for loop
    public static GetForEnd(condition: ts.Expression, transpiler: LuaTranspiler): string {
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
                        throw new TranspileError(
                            "Unsupported for-loop condition operator: " +
                            tsEx.enumName(condition.operatorToken, ts.SyntaxKind),
                            condition
                        );
                }
            } else {
                // Account for lua 1 indexing
                switch (condition.operatorToken.kind) {
                    case ts.SyntaxKind.LessThanEqualsToken:
                    case ts.SyntaxKind.GreaterThanEqualsToken:
                        return transpiler.transpileExpression(condition.left);
                    case ts.SyntaxKind.LessThanToken:
                        return transpiler.transpileExpression(condition.left) + "+1";
                    case ts.SyntaxKind.GreaterThanToken:
                        return transpiler.transpileExpression(condition.left) + "-1";
                    default:
                        throw new TranspileError(
                            "Unsupported for-loop condition operator: " +
                            tsEx.enumName(condition.operatorToken, ts.SyntaxKind),
                            condition
                        );
                }
            }
        } else {
            throw new TranspileError(
                "Unsupported for-loop condition type: " +
                tsEx.enumName(condition.kind, ts.SyntaxKind),
                condition
            );
        }
    }

    // Get increment step for numeric for loop
    public static GetForStep(incrementor: ts.Expression, transpiler: LuaTranspiler): string {
        switch (incrementor.kind) {
            case ts.SyntaxKind.PostfixUnaryExpression:
            case ts.SyntaxKind.PrefixUnaryExpression:
                const operator =
                    (incrementor as ts.PostfixUnaryExpression|ts.PrefixUnaryExpression).operator;
                switch (operator) {
                    case ts.SyntaxKind.PlusPlusToken:
                        return "1";
                    case ts.SyntaxKind.MinusMinusToken:
                        return "-1";
                    default:
                        throw new TranspileError(
                            "Unsupported for-loop increment step: " +
                            tsEx.enumName(incrementor.kind, ts.SyntaxKind),
                            incrementor
                        );
                }
            case ts.SyntaxKind.BinaryExpression:
                const value = ts.isIdentifier((incrementor as ts.BinaryExpression).left) ?
                    transpiler.transpileExpression((incrementor as ts.BinaryExpression).right) :
                    transpiler.transpileExpression((incrementor as ts.BinaryExpression).left);
                switch ((incrementor as ts.BinaryExpression).operatorToken.kind) {
                    case ts.SyntaxKind.PlusEqualsToken:
                        return value;
                    case ts.SyntaxKind.MinusEqualsToken:
                        return "-" + value;
                    default:
                        throw new TranspileError(
                            "Unsupported for-loop increment step: " +
                            tsEx.enumName(incrementor.kind, ts.SyntaxKind),
                            incrementor
                        );
                }
            default:
                throw new TranspileError(
                    "Unsupported for-loop increment step: " +
                    tsEx.enumName(incrementor.kind, ts.SyntaxKind),
                    incrementor
                );
        }
    }
}
