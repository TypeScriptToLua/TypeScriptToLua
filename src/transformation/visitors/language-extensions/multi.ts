import * as ts from "typescript";
import * as extensions from "../../utils/language-extensions";
import {
    getExtensionKindForNode,
    getIterableExtensionKindForNode,
    IterableExtensionKind,
} from "../../utils/language-extensions";
import { TransformationContext } from "../../context";
import { findFirstNodeAbove } from "../../utils/typescript";

const multiReturnExtensionName = "__tstlMultiReturn";
export function isMultiReturnType(type: ts.Type): boolean {
    return type.getProperty(multiReturnExtensionName) !== undefined;
}

export function canBeMultiReturnType(type: ts.Type): boolean {
    return isMultiReturnType(type) || (type.isUnion() && type.types.some(t => canBeMultiReturnType(t)));
}

export function isMultiFunctionCall(context: TransformationContext, expression: ts.CallExpression): boolean {
    return isMultiFunctionNode(context, expression.expression);
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
    return (
        ts.isIdentifier(node) &&
        node.text === "$multi" &&
        getExtensionKindForNode(context, node) === extensions.ExtensionKind.MultiFunction
    );
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

export function shouldMultiReturnCallBeWrapped(context: TransformationContext, node: ts.CallExpression) {
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

    // LuaIterable in for...of
    if (
        ts.isForOfStatement(node.parent) &&
        getIterableExtensionKindForNode(context, node) === IterableExtensionKind.Iterable
    ) {
        return false;
    }

    return true;
}
