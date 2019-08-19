import * as ts from "typescript";
import { DecoratorKind, getCustomDecorators } from "../../utils/decorators";
import { TransformationContext } from "../../context";

export function isStaticNode(node: ts.Node): boolean {
    return node.modifiers !== undefined && node.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
}

export function getExtendedTypeNode(
    context: TransformationContext,
    node: ts.ClassLikeDeclarationBase
): ts.ExpressionWithTypeArguments | undefined {
    if (node && node.heritageClauses) {
        for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                const superType = context.checker.getTypeAtLocation(clause.types[0]);
                const decorators = getCustomDecorators(context, superType);
                if (!decorators.has(DecoratorKind.PureAbstract)) {
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

export function findInClassOrAncestor(
    context: TransformationContext,
    classDeclaration: ts.ClassLikeDeclarationBase,
    callback: (classDeclaration: ts.ClassLikeDeclarationBase) => boolean
): ts.ClassLikeDeclarationBase | undefined {
    if (callback(classDeclaration)) {
        return classDeclaration;
    }

    const extendsType = getExtendedType(context, classDeclaration);
    if (!extendsType) {
        return undefined;
    }

    const symbol = extendsType.getSymbol();
    if (symbol === undefined) {
        return undefined;
    }

    const symbolDeclarations = symbol.getDeclarations();
    if (symbolDeclarations === undefined) {
        return undefined;
    }

    const declaration = symbolDeclarations.find(ts.isClassLike);
    if (!declaration) {
        return undefined;
    }

    return findInClassOrAncestor(context, declaration, callback);
}
