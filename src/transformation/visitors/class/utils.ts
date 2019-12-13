import * as ts from "typescript";
import { TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";

export function isStaticNode(node: ts.Node): boolean {
    return (node.modifiers ?? []).some(m => m.kind === ts.SyntaxKind.StaticKeyword);
}

export function getExtendedTypeNode(
    context: TransformationContext,
    node: ts.ClassLikeDeclarationBase
): ts.ExpressionWithTypeArguments | undefined {
    if (node && node.heritageClauses) {
        for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                const superType = context.checker.getTypeAtLocation(clause.types[0]);
                const annotations = getTypeAnnotations(context, superType);
                if (!annotations.has(AnnotationKind.PureAbstract)) {
                    return clause.types[0];
                }
            }
        }
    }
}

export function getExtendedType(
    context: TransformationContext,
    node: ts.ClassLikeDeclarationBase
): ts.Type | undefined {
    const extendedTypeNode = getExtendedTypeNode(context, node);
    return extendedTypeNode && context.checker.getTypeAtLocation(extendedTypeNode);
}
