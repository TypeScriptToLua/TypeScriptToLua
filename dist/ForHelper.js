"use strict";
exports.__esModule = true;
var ts = require("typescript");
var TSHelper_1 = require("./TSHelper");
var Transpiler_1 = require("./Transpiler");
var ForHelper = /** @class */ (function () {
    function ForHelper() {
    }
    // Get the ending value of a numeric for loop
    ForHelper.GetForEnd = function (condition, transpiler) {
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
                        throw new Transpiler_1.TranspileError("Unsupported for-loop condition operator: " + TSHelper_1.TSHelper.enumName(condition.operatorToken, ts.SyntaxKind), condition);
                }
            }
            else {
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
                        throw new Transpiler_1.TranspileError("Unsupported for-loop condition operator: " + TSHelper_1.TSHelper.enumName(condition.operatorToken, ts.SyntaxKind), condition);
                }
            }
        }
        else {
            throw new Transpiler_1.TranspileError("Unsupported for-loop condition type: " + TSHelper_1.TSHelper.enumName(condition.kind, ts.SyntaxKind), condition);
        }
    };
    // Get increment step for numeric for loop
    ForHelper.GetForStep = function (incrementor, transpiler) {
        switch (incrementor.kind) {
            case ts.SyntaxKind.PostfixUnaryExpression:
            case ts.SyntaxKind.PrefixUnaryExpression:
                switch (incrementor.operator) {
                    case ts.SyntaxKind.PlusPlusToken:
                        return "1";
                    case ts.SyntaxKind.MinusMinusToken:
                        return "-1";
                    default:
                        throw new Transpiler_1.TranspileError("Unsupported for-loop increment step: " + TSHelper_1.TSHelper.enumName(incrementor.kind, ts.SyntaxKind), incrementor);
                }
            case ts.SyntaxKind.BinaryExpression:
                var value = ts.isIdentifier(incrementor.left) ?
                    transpiler.transpileExpression(incrementor.right) :
                    transpiler.transpileExpression(incrementor.left);
                switch (incrementor.operatorToken.kind) {
                    case ts.SyntaxKind.PlusEqualsToken:
                        return value;
                    case ts.SyntaxKind.MinusEqualsToken:
                        return "-" + value;
                    default:
                        throw new Transpiler_1.TranspileError("Unsupported for-loop increment step: " + TSHelper_1.TSHelper.enumName(incrementor.kind, ts.SyntaxKind), incrementor);
                }
            default:
                throw new Transpiler_1.TranspileError("Unsupported for-loop increment step: " + TSHelper_1.TSHelper.enumName(incrementor.kind, ts.SyntaxKind), incrementor);
        }
    };
    return ForHelper;
}());
exports.ForHelper = ForHelper;
//# sourceMappingURL=ForHelper.js.map