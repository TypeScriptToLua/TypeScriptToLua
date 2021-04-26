/**
 * This is a TS tranformer plugin that replaces any return statement to 'return true'.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts = tslib_1.__importStar(require("typescript"));

const replaceNode = node => {
    if (ts.isReturnStatement(node)) {
        return ts.factory.createReturnStatement(ts.factory.createTrue());
    }
};
const createTransformer = () => context => {
    const visit = node => replaceNode(node) || ts.visitEachChild(node, visit, context);
    return file => ts.visitNode(file, visit);
};
exports.default = createTransformer;
