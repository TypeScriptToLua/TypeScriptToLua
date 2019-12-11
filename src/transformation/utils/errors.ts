import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";

export class TranspileError extends Error {
    public name = "TranspileError";
    constructor(message: string, public node: ts.Node) {
        super(message);
    }
}

const getLuaTargetName = (version: LuaTarget) => (version === LuaTarget.LuaJIT ? "LuaJIT" : `Lua ${version}`);

export const InvalidDecoratorContext = (node: ts.Node) =>
    new TranspileError(`Decorator function cannot have 'this: void'.`, node);

export const MissingForOfVariables = (node: ts.Node) =>
    new TranspileError("Transpiled ForOf variable declaration list contains no declarations.", node);

export const UnsupportedForInVariable = (node: ts.Node) =>
    new TranspileError(`Unsupported for-in variable kind.`, node);

export const UndefinedScope = () => new Error("Expected to pop a scope, but found undefined.");

export const UnsupportedKind = (description: string, kind: ts.SyntaxKind, node: ts.Node) =>
    new TranspileError(`Unsupported ${description} kind: ${ts.SyntaxKind[kind]}`, node);

export const UnsupportedProperty = (parentName: string, property: string, node: ts.Node) =>
    new TranspileError(`Unsupported property on ${parentName}: ${property}`, node);

export const UnsupportedForTarget = (functionality: string, version: LuaTarget, node: ts.Node) =>
    new TranspileError(`${functionality} is/are not supported for target ${getLuaTargetName(version)}.`, node);

export const UnsupportedNoSelfFunctionConversion = (node: ts.Node, name?: string) => {
    const nameReference = name ? ` '${name}'` : "";
    return new TranspileError(
        `Unable to convert function with a 'this' parameter to function${nameReference} with no 'this'. ` +
            `To fix, wrap in an arrow function, or declare with 'this: void'.`,
        node
    );
};

export const UnsupportedSelfFunctionConversion = (node: ts.Node, name?: string) => {
    const nameReference = name ? ` '${name}'` : "";
    return new TranspileError(
        `Unable to convert function with no 'this' parameter to function${nameReference} with 'this'. ` +
            `To fix, wrap in an arrow function or declare with 'this: any'.`,
        node
    );
};

export const UnsupportedOverloadAssignment = (node: ts.Node, name?: string) => {
    const nameReference = name ? ` to '${name}'` : "";
    return new TranspileError(
        `Unsupported assignment of function with different overloaded types for 'this'${nameReference}. ` +
            "Overloads should all have the same type for 'this'.",
        node
    );
};

export const UnresolvableRequirePath = (node: ts.Node, reason: string, path?: string) =>
    new TranspileError(`${reason}. TypeScript path: ${path}.`, node);

export const ReferencedBeforeDeclaration = (node: ts.Identifier) =>
    new TranspileError(
        `Identifier "${node.text}" was referenced before it was declared. The declaration ` +
            "must be moved before the identifier's use, or hoisting must be enabled.",
        node
    );

export const UnsupportedObjectDestructuringInForOf = (node: ts.Node) =>
    new TranspileError(`Unsupported object destructuring in for...of statement.`, node);

export const InvalidAmbientIdentifierName = (node: ts.Identifier) =>
    new TranspileError(
        `Invalid ambient identifier name "${node.text}". Ambient identifiers must be valid lua identifiers.`,
        node
    );
