import * as ts from "typescript";
import { findFirstNodeAbove } from ".";
import { TransformationContext } from "../../context";

export function isAssignmentPattern(node: ts.Node): node is ts.AssignmentPattern {
    return ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node);
}

export function isDestructuringAssignment(node: ts.Node): node is ts.DestructuringAssignment {
    return (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        isAssignmentPattern(node.left)
    );
}

export function isAmbientNode(node: ts.Declaration): boolean {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Ambient) !== 0;
}

export function isInDestructingAssignment(node: ts.Node): boolean {
    return (
        node.parent &&
        ((ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name)) ||
            (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left)))
    );
}

export function isInAsyncFunction(node: ts.Node): boolean {
    // Check if node is in function declaration with `async`
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (!declaration) {
        return false;
    }

    if (ts.canHaveModifiers(declaration)) {
        return ts.getModifiers(declaration)?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    } else {
        return false;
    }
}

export function isInGeneratorFunction(node: ts.Node): boolean {
    // Check if node is in function declaration with `async`
    const declaration = findFirstNodeAbove(node, ts.isFunctionDeclaration);
    if (!declaration) {
        return false;
    }

    return declaration.asteriskToken !== undefined;
}

/**
 * Quite hacky, avoid unless absolutely necessary!
 */
export function getSymbolOfNode(context: TransformationContext, node: ts.Node): ts.Symbol | undefined {
    return (node as any).symbol ?? context.checker.getSymbolAtLocation(node);
}

export function isFirstDeclaration(context: TransformationContext, node: ts.Node) {
    const symbol = getSymbolOfNode(context, node);
    return symbol ? symbol.valueDeclaration === node : true;
}
