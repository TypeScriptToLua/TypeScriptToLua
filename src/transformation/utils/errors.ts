import * as ts from "typescript";

export class TranspileError extends Error {
    public name = "TranspileError";
    constructor(message: string, public node: ts.Node) {
        super(message);
    }
}

export const InvalidDecoratorContext = (node: ts.Node) =>
    new TranspileError(`Decorator function cannot have 'this: void'.`, node);

export const UndefinedScope = () => new Error("Expected to pop a scope, but found undefined.");

export const UnresolvableRequirePath = (node: ts.Node, reason: string, path?: string) =>
    new TranspileError(`${reason}. TypeScript path: ${path}.`, node);

export const ReferencedBeforeDeclaration = (node: ts.Identifier) =>
    new TranspileError(
        `Identifier "${node.text}" was referenced before it was declared. The declaration ` +
            "must be moved before the identifier's use, or hoisting must be enabled.",
        node
    );
