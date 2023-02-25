import * as ts from "typescript";
import * as extensions from "../../utils/language-extensions";
import {
    getExtensionKindForNode,
    getIterableExtensionKindForNode,
    IterableExtensionKind,
} from "../../utils/language-extensions";
import { TransformationContext } from "../../context";
import { findFirstNodeAbove, findFirstNonOuterParent } from "../../utils/typescript";

const multiReturnExtensionName = "__tstlMultiReturn";
export function isMultiReturnType(type: ts.Type): boolean {
    return type.getProperty(multiReturnExtensionName) !== undefined;
}

export function canBeMultiReturnType(type: ts.Type): boolean {
    return (
        (type.flags & ts.TypeFlags.Any) !== 0 ||
        isMultiReturnType(type) ||
        (type.isUnion() && type.types.some(t => canBeMultiReturnType(t)))
    );
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

    const parent = findFirstNonOuterParent(node);

    // Variable declaration with destructuring
    if (ts.isVariableDeclaration(parent) && ts.isArrayBindingPattern(parent.name)) {
        return false;
    }

    // Variable assignment with destructuring
    if (
        ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isArrayLiteralExpression(parent.left)
    ) {
        return false;
    }

    // Spread operator
    if (ts.isSpreadElement(parent)) {
        return false;
    }

    // Stand-alone expression
    if (ts.isExpressionStatement(parent)) {
        return false;
    }

    // Forwarded multi-return call
    if (
        (ts.isReturnStatement(parent) || ts.isArrowFunction(parent)) && // Body-less arrow func
        isInMultiReturnFunction(context, node)
    ) {
        return false;
    }

    // Element access expression 'foo()[0]' will be optimized using 'select'
    if (ts.isElementAccessExpression(parent)) {
        return false;
    }

    // LuaIterable in for...of
    if (
        ts.isForOfStatement(parent) &&
        getIterableExtensionKindForNode(context, node) === IterableExtensionKind.Iterable
    ) {
        return false;
    }

    return true;
}
