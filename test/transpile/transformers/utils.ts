import * as ts from "typescript";

export function visitAndReplace<T extends ts.Node>(context: ts.TransformationContext, node: T, visitor: ts.Visitor): T {
    const visit: ts.Visitor = node => visitor(node) ?? ts.visitEachChild(node, visit, context);
    return ts.visitNode(node, visit);
}
