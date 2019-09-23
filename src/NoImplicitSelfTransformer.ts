import * as ts from "typescript";

const transformSourceFile: ts.Transformer<ts.SourceFile> = node => {
    const empty = ts.createNotEmittedStatement(undefined!);
    ts.addSyntheticLeadingComment(empty, ts.SyntaxKind.MultiLineCommentTrivia, "* @noSelfInFile ", true);
    return ts.updateSourceFileNode(node, [empty, ...node.statements], node.isDeclarationFile);
};

export const noImplicitSelfTransformer: ts.TransformerFactory<ts.SourceFile | ts.Bundle> = () => node =>
    ts.isBundle(node) ? ts.updateBundle(node, node.sourceFiles.map(transformSourceFile)) : transformSourceFile(node);
