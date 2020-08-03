import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import * as helpers from "../../utils/helpers";
import { isNonNull } from "../../../utils";
import { TransformationContext } from "../../context";
import { transformArguments } from "../call";
import { unsupportedMultiHelperFunctionPosition } from "../../../transformation/utils/diagnostics";

const isMultiHelperDeclaration = (context: TransformationContext) => (declaration: ts.Declaration): boolean =>
    helpers.getHelperFileKind(context, declaration.getSourceFile()) === helpers.HelperKind.Multi;

function isMultiHelperCallSignature(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return type.symbol?.declarations?.some(isMultiHelperDeclaration(context)) ?? false;
}

export function isMultiReturnCall(context: TransformationContext, node: ts.Node): node is ts.CallExpression {
    if (!ts.isCallExpression(node)) {
        return false;
    }

    const signature = context.checker.getResolvedSignature(node);
    return signature?.getReturnType().aliasSymbol?.declarations?.some(isMultiHelperDeclaration(context)) ?? false;
}

export function isMultiHelperNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return type.symbol?.declarations?.some(isMultiHelperDeclaration(context)) ?? false;
}

export function transformMultiHelperReturnStatement(
    context: TransformationContext,
    statement: ts.ReturnStatement
): lua.Statement | undefined {
    if (!statement.expression) return;
    if (!ts.isCallExpression(statement.expression)) return;
    if (!isMultiHelperCallSignature(context, statement.expression)) return;

    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
}

export function findMultiHelperAssignmentViolations(
    context: TransformationContext,
    node: ts.ObjectLiteralExpression
): ts.Node[] {
    return node.properties
        .filter(ts.isShorthandPropertyAssignment)
        .map(element => {
            const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
            if (valueSymbol) {
                const declaration = valueSymbol.valueDeclaration;
                if (declaration && isMultiHelperDeclaration(context)(declaration)) {
                    context.diagnostics.push(unsupportedMultiHelperFunctionPosition(element));
                    return element;
                }
            }
        })
        .filter(isNonNull);
}
