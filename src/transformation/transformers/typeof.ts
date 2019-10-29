import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { LuaLibFeature } from "../../LuaLib";
import { FunctionVisitor, TransformationContext } from "../context";
import { transformLuaLibFunction } from "../utils/lualib";
import { transformBinaryOperation } from "./binary-expression";

export const transformTypeOfExpression: FunctionVisitor<ts.TypeOfExpression> = (node, context) => {
    const innerExpression = context.transformExpression(node.expression);
    return transformLuaLibFunction(context, LuaLibFeature.TypeOf, node, innerExpression);
};

export function transformTypeOfBinaryExpression(
    context: TransformationContext,
    node: ts.BinaryExpression
): lua.Expression | undefined {
    const operator = node.operatorToken.kind;
    function transformTypeOfLiteralComparison(
        typeOfExpression: ts.TypeOfExpression,
        comparedExpression: lua.StringLiteral
    ): lua.Expression {
        if (comparedExpression.value === "object") {
            comparedExpression.value = "table";
        } else if (comparedExpression.value === "undefined") {
            comparedExpression.value = "nil";
        }

        const innerExpression = context.transformExpression(typeOfExpression.expression);
        const typeCall = lua.createCallExpression(lua.createIdentifier("type"), [innerExpression], typeOfExpression);
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
            if (lua.isStringLiteral(right)) {
                return transformTypeOfLiteralComparison(node.left, right);
            }
        } else if (ts.isTypeOfExpression(node.right)) {
            const left = context.transformExpression(node.left);
            if (lua.isStringLiteral(left)) {
                return transformTypeOfLiteralComparison(node.right, left);
            }
        }
    }
}
