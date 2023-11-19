import * as ts from "typescript";
import { TransformationContext } from "../../context";

export function isPrivateNode(node: ts.HasModifiers): boolean {
    return node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) === true;
}

export function isStaticNode(node: ts.HasModifiers): boolean {
    return node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) === true;
}

export function getExtendsClause(node: ts.ClassLikeDeclarationBase): ts.HeritageClause | undefined {
    return node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
}

export function getExtendedNode(node: ts.ClassLikeDeclarationBase): ts.ExpressionWithTypeArguments | undefined {
    const extendsClause = getExtendsClause(node);
    if (!extendsClause) return;

    return extendsClause.types[0];
}

export function getExtendedType(
    context: TransformationContext,
    node: ts.ClassLikeDeclarationBase
): ts.Type | undefined {
    const extendedNode = getExtendedNode(node);
    return extendedNode && context.checker.getTypeAtLocation(extendedNode);
}
