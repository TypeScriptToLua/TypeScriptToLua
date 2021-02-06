import * as ts from "typescript";
import * as extensions from "../../utils/language-extensions";
import { TransformationContext } from "../../context";
import { invalidMultiFunctionUse } from "../../utils/diagnostics";
import { findFirstNodeAbove } from "../../utils/typescript";

const isMultiFunctionDeclaration = (declaration: ts.Declaration): boolean =>
    extensions.getExtensionKind(declaration) === extensions.ExtensionKind.MultiFunction;

const isMultiTypeDeclaration = (declaration: ts.Declaration): boolean =>
    extensions.getExtensionKind(declaration) === extensions.ExtensionKind.MultiType;

export function isMultiReturnType(type: ts.Type): boolean {
    return (
        (type.symbol?.declarations?.some(isMultiTypeDeclaration) ||
            type.aliasSymbol?.declarations?.some(isMultiTypeDeclaration)) ??
        false
    );
}

export function isMultiFunction(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return type.symbol?.declarations?.some(isMultiFunctionDeclaration) ?? false;
}

export function returnsMultiType(context: TransformationContext, node: ts.CallExpression): boolean {
    const signature = context.checker.getResolvedSignature(node);
    const type = signature?.getReturnType();
    return type ? isMultiReturnType(type) : false;
}

export function isMultiReturnCall(context: TransformationContext, expression: ts.Expression) {
    return ts.isCallExpression(expression) && returnsMultiType(context, expression);
}

export function isMultiFunctionNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return type.symbol?.declarations?.some(isMultiFunctionDeclaration) ?? false;
}

export function isInMultiReturnFunction(context: TransformationContext, node: ts.Node) {
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (!declaration) {
        return false;
    }
    const signature = context.checker.getSignatureFromDeclaration(declaration);
    const type = signature?.getReturnType();
    return type ? isMultiReturnType(type) : false;
}

export function multiReturnCallShouldBeWrapped(context: TransformationContext, node: ts.CallExpression) {
    if (!returnsMultiType(context, node)) {
        return false;
    }

    // Variable declaration with destructuring
    if (ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name)) {
        return false;
    }

    // Variable assignment with destructuring
    if (
        ts.isBinaryExpression(node.parent) &&
        node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isArrayLiteralExpression(node.parent.left)
    ) {
        return false;
    }

    // Spread operator
    if (ts.isSpreadElement(node.parent)) {
        return false;
    }

    // Stand-alone expression
    if (ts.isExpressionStatement(node.parent)) {
        return false;
    }

    // Forwarded multi-return call
    if (
        (ts.isReturnStatement(node.parent) || ts.isArrowFunction(node.parent)) && // Body-less arrow func
        isInMultiReturnFunction(context, node)
    ) {
        return false;
    }

    // Element access expression 'foo()[0]' will be optimized using 'select'
    if (ts.isElementAccessExpression(node.parent)) {
        return false;
    }

    return true;
}

export function findMultiAssignmentViolations(
    context: TransformationContext,
    node: ts.ObjectLiteralExpression
): ts.Node[] {
    const result: ts.Node[] = [];

    for (const element of node.properties) {
        if (!ts.isShorthandPropertyAssignment(element)) continue;
        const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
        if (valueSymbol) {
            const declaration = valueSymbol.valueDeclaration;
            if (declaration && isMultiFunctionDeclaration(declaration)) {
                context.diagnostics.push(invalidMultiFunctionUse(element));
                result.push(element);
            }
        }
    }

    return result;
}
