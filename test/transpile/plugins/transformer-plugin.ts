/**
 * This is a TS tranformer plugin that replaces any return statement to 'return true'.
 */
import * as ts from "typescript";

const replaceNode = (node: ts.Node) => {
    if (ts.isReturnStatement(node)) {
        return ts.factory.createReturnStatement(ts.factory.createTrue());
    }
};
const createTransformer = () => (context: ts.TransformationContext) => {
    const visit = (node: ts.Node): ts.Node => replaceNode(node) ?? ts.visitEachChild(node, visit, context);
    return (file: ts.SourceFile) => ts.visitNode(file, visit);
};
exports.default = createTransformer;
