import * as ts from "typescript";

export class TranspileError extends Error {
    public name = "TranspileError";
    constructor(message: string, public node: ts.Node) {
        super(message);
    }
}
