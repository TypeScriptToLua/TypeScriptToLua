const ts = require("typescript");

module.exports.default = () => context => file => {
    const replaceNode = node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(true));
    };

    const visit = node => replaceNode(node) || ts.visitEachChild(node, visit, context);
    return ts.visitNode(file, visit);
};
