import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { LuaLibFeature } from "../../LuaLib";
import { FunctionVisitor, TransformerPlugin } from "../context";
import { transformLuaLibFunction } from "../utils/lualib";
import { transformBinaryOperation } from "./binary";

const transformTypeOfExpression: FunctionVisitor<ts.TypeOfExpression> = (node, context) => {
    const innerExpression = context.transformExpression(node.expression);
    return transformLuaLibFunction(context, LuaLibFeature.TypeOf, node, innerExpression);
};

const transformBinaryExpression: FunctionVisitor<ts.BinaryExpression> = (node, context) => {
    const operator = node.operatorToken.kind;
    function transformTypeOfLiteralComparison(
        typeOfExpression: ts.TypeOfExpression,
        comparedExpression: tstl.StringLiteral
    ): tstl.Expression {
        if (comparedExpression.value === "object") {
            comparedExpression.value = "table";
        } else if (comparedExpression.value === "undefined") {
            comparedExpression.value = "nil";
        }

        const innerExpression = context.transformExpression(typeOfExpression.expression);
        const typeCall = tstl.createCallExpression(tstl.createIdentifier("type"), [innerExpression], typeOfExpression);
        return transformBinaryOperation(context, typeCall, comparedExpression, operator, node);
    }

    if (
        operator === ts.SyntaxKind.EqualsEqualsToken ||
        operator === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        operator === ts.SyntaxKind.ExclamationEqualsToken ||
        operator === ts.SyntaxKind.ExclamationEqualsEqualsToken
    ) {
        if (ts.isTypeOfExpression(node.left)) {
            const right = context.transformExpression(node.right);
            if (tstl.isStringLiteral(right)) {
                return transformTypeOfLiteralComparison(node.left, right);
            }
        } else if (ts.isTypeOfExpression(node.right)) {
            const left = context.transformExpression(node.left);
            if (tstl.isStringLiteral(left)) {
                return transformTypeOfLiteralComparison(node.right, left);
            }
        }
    }

    return context.superTransformExpression(node);
};

export const typeofPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.TypeOfExpression]: transformTypeOfExpression,
        [ts.SyntaxKind.BinaryExpression]: { priority: 1, transform: transformBinaryExpression },
    },
};
