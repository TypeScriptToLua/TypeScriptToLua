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

export function isDeclaration(node: ts.Node): node is ts.Declaration {
    return (
        ts.isEnumDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isImportDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isModuleDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isVariableDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isNamespaceExportDeclaration(node)
    );
}

export function isInDestructingAssignment(node: ts.Node): boolean {
    return (
        node.parent &&
        ((ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name)) ||
            (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left)))
    );
}
