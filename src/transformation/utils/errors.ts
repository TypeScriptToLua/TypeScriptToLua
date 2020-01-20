import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";

export class TranspileError extends Error {
    public name = "TranspileError";
    constructor(message: string, public node: ts.Node) {
        super(message);
    }
}

const getLuaTargetName = (version: LuaTarget) => (version === LuaTarget.LuaJIT ? "LuaJIT" : `Lua ${version}`);

export const ForbiddenForIn = (node: ts.Node) =>
    new TranspileError(`Iterating over arrays with 'for ... in' is not allowed.`, node);

export const ForbiddenLuaTableNonDeclaration = (node: ts.Node) =>
    new TranspileError(`Classes with the '@luaTable' annotation must be declared.`, node);

export const InvalidExtendsLuaTable = (node: ts.Node) =>
    new TranspileError(`Cannot extend classes with the '@luaTable' annotation.`, node);

export const InvalidInstanceOfLuaTable = (node: ts.Node) =>
    new TranspileError(`The instanceof operator cannot be used with a '@luaTable' class.`, node);

export const ForbiddenLuaTableUseException = (description: string, node: ts.Node) =>
    new TranspileError(`Invalid @luaTable usage: ${description}`, node);

export const InvalidAnnotationArgumentNumber = (name: string, got: number, expected: number, node: ts.Node) =>
    new TranspileError(`'${name}' expects ${expected} argument(s) but got ${got}.`, node);

export const InvalidDecoratorContext = (node: ts.Node) =>
    new TranspileError(`Decorator function cannot have 'this: void'.`, node);

export const InvalidExtensionMetaExtension = (node: ts.Node) =>
    new TranspileError(`Cannot use both '@extension' and '@metaExtension' annotations on the same class.`, node);

export const InvalidNewExpressionOnExtension = (node: ts.Node) =>
    new TranspileError(`Cannot construct classes with '@extension' or '@metaExtension' annotation.`, node);

export const InvalidExportDeclaration = (declaration: ts.ExportDeclaration) =>
    new TranspileError("Encountered invalid export declaration without exports and without module.", declaration);

export const InvalidExtendsExtension = (node: ts.Node) =>
    new TranspileError(`Cannot extend classes with '@extension' or '@metaExtension' annotation.`, node);

export const InvalidExportsExtension = (node: ts.Node) =>
    new TranspileError(`Cannot export classes with '@extension' or '@metaExtension' annotation.`, node);

export const InvalidInstanceOfExtension = (node: ts.Node) =>
    new TranspileError(`Cannot use instanceof on classes with '@extension' or '@metaExtension' annotation.`, node);

export const InvalidJsonFileContent = (node: ts.Node) => new TranspileError("Invalid JSON file content", node);

export const MissingClassName = (node: ts.Node) => new TranspileError(`Class declarations must have a name.`, node);

export const MissingForOfVariables = (node: ts.Node) =>
    new TranspileError("Transpiled ForOf variable declaration list contains no declarations.", node);

export const MissingFunctionName = (declaration: ts.FunctionLikeDeclaration) =>
    new TranspileError("Unsupported function declaration without name.", declaration);

export const MissingMetaExtension = (node: ts.Node) =>
    new TranspileError(`'@metaExtension' annotation requires the extension of the metatable class.`, node);

export const NonFlattenableDestructure = (node: ts.Node) =>
    new TranspileError(`This node cannot be destructured using a standard Lua assignment statement.`, node);

export const UndefinedFunctionDefinition = (functionSymbolId: number) =>
    new Error(`Function definition for function symbol ${functionSymbolId} is undefined.`);

export const UnsupportedForInVariable = (node: ts.Node) =>
    new TranspileError(`Unsupported for-in variable kind.`, node);

export const UndefinedScope = () => new Error("Expected to pop a scope, but found undefined.");

export const UndefinedTypeNode = (node: ts.Node) => new TranspileError("Failed to resolve required type node.", node);

export const UnknownSuperType = (node: ts.Node) =>
    new TranspileError("Unable to resolve type of super expression.", node);

export const UnsupportedImportType = (node: ts.Node) => new TranspileError(`Unsupported import type.`, node);

export const UnsupportedKind = (description: string, kind: ts.SyntaxKind, node: ts.Node) =>
    new TranspileError(`Unsupported ${description} kind: ${ts.SyntaxKind[kind]}`, node);

export const UnsupportedProperty = (parentName: string, property: string, node: ts.Node) =>
    new TranspileError(`Unsupported property on ${parentName}: ${property}`, node);

export const UnsupportedForTarget = (functionality: string, version: LuaTarget, node: ts.Node) =>
    new TranspileError(`${functionality} is/are not supported for target ${getLuaTargetName(version)}.`, node);

export const UnsupportedFunctionWithoutBody = (node: ts.FunctionLikeDeclaration) =>
    new TranspileError("Functions with undefined bodies are not supported.", node);

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

export const UnsupportedNonDestructuringLuaIterator = (node: ts.Node) =>
    new TranspileError(
        "Unsupported use of lua iterator with '@tupleReturn' annotation in for...of statement. " +
            "You must use a destructuring statement to catch results from a lua iterator with " +
            "the '@tupleReturn' annotation.",
        node
    );

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

export const InvalidForRangeCall = (node: ts.Node, message: string) =>
    new TranspileError(`Invalid @forRange call: ${message}`, node);

export const UnsupportedVarDeclaration = (node: ts.Node) =>
    new TranspileError("`var` declarations are not supported. Use `let` or `const` instead.", node);
