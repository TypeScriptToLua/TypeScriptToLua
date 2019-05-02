import * as ts from "typescript";

// tslint:disable-next-line: no-default-export
export default (program: ts.Program): ts.TransformerFactory<ts.SourceFile> => context => file => {
    const typeChecker = program.getTypeChecker();
    const replaceNode: ts.Visitor = node => {
        if (!ts.isReturnStatement(node) || !node.expression) return;
        const type = typeChecker.getTypeAtLocation(node.expression);
        if ((type.flags & ts.TypeFlags.BooleanLiteral) === 0) return;
        return ts.updateReturn(node, ts.createLiteral(true));
    };

    const visit: ts.Visitor = node => replaceNode(node) || ts.visitEachChild(node, visit, context);
    return ts.visitNode(file, visit);
};
