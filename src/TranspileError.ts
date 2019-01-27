import * as ts from "typescript";

export class TranspileError extends Error {
    public node: ts.Node;
    constructor(message: string, node: ts.Node) {
        super(message);
        this.node = node;
    }
}
