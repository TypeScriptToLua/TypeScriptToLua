import * as ts from "typescript";

export function noSelfTransformerFactory<T extends ts.Node>(_context: ts.TransformationContext): ts.Transformer<T> {
    return function transform(node: T): T {
        if (ts.isSourceFile(node)) {
            const empty = ts.createEmptyStatement();
            ts.addSyntheticLeadingComment(empty, ts.SyntaxKind.MultiLineCommentTrivia, "* @noSelfInFile ", true);
            return (ts.updateSourceFileNode(node, [empty, ...node.statements]) as unknown) as T;
        }
        return node;
    };
}
