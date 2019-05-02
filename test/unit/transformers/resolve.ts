import * as ts from "typescript";

// tslint:disable-next-line: no-default-export
export default (): ts.TransformerFactory<ts.SourceFile> => context => file => {
    const replaceNode: ts.Visitor = node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(true));
    };

    const visit: ts.Visitor = node => replaceNode(node) || ts.visitEachChild(node, visit, context);
    return ts.visitNode(file, visit);
};
