import * as ts from "typescript";

// tslint:disable-next-line: no-default-export
export default (
    _program: ts.Program,
    { value }: { value: any },
): ts.TransformerFactory<ts.SourceFile> => context => file => {
    const replaceNode: ts.Visitor = node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(value));
    };

    const visit: ts.Visitor = node => replaceNode(node) || ts.visitEachChild(node, visit, context);
    return ts.visitNode(file, visit);
};
