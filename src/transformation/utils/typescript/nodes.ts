import * as ts from "typescript";

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
