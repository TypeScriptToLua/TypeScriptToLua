import * as ts from "typescript";
import { LuaTarget } from "./CompilerOptions";
import { TranspileError } from "./TranspileError";

const getLuaTargetName = (version: LuaTarget) => (version === LuaTarget.LuaJIT ? "LuaJIT" : `Lua ${version}`);

export const CouldNotCast = (castName: string) =>
    new Error(`Failed to cast all elements to expected type using ${castName}.`);

export const DefaultImportsNotSupported = (node: ts.Node) =>
    new TranspileError(`Default Imports are not supported, please use named imports instead!`, node);

export const ForbiddenEllipsisDestruction = (node: ts.Node) =>
    new TranspileError(`Ellipsis destruction is not allowed.`, node);

export const ForbiddenForIn = (node: ts.Node) =>
    new TranspileError(`Iterating over arrays with 'for ... in' is not allowed.`, node);

export const ForbiddenLuaTableSetExpression = (node: ts.Node) =>
    new TranspileError(
        `A '@luaTable' object's 'set()' method can only be used as a Statement, not an Expression.`,
        node
    );

export const ForbiddenLuaTableNonDeclaration = (node: ts.Node) =>
    new TranspileError(`Classes with the '@luaTable' decorator must be declared.`, node);

export const InvalidExtendsLuaTable = (node: ts.Node) =>
    new TranspileError(`Cannot extend classes with the decorator '@luaTable'.`, node);

export const InvalidInstanceOfLuaTable = (node: ts.Node) =>
    new TranspileError(`The instanceof operator cannot be used with a '@luaTable' class.`, node);

export const ForbiddenLuaTableUseException = (description: string, node: ts.Node) =>
    new TranspileError(`Invalid @luaTable usage: ${description}`, node);

export const HeterogeneousEnum = (node: ts.Node) =>
    new TranspileError(
        `Invalid heterogeneous enum. Enums should either specify no member values, ` +
            `or specify values (of the same type) for all members.`,
        node
    );

export const InvalidDecoratorArgumentNumber = (name: string, got: number, expected: number, node: ts.Node) =>
    new TranspileError(`${name} expects ${expected} argument(s) but got ${got}.`, node);

export const InvalidDecoratorContext = (node: ts.Node) =>
    new TranspileError(`Decorator function cannot have 'this: void'.`, node);

export const InvalidExtensionMetaExtension = (node: ts.Node) =>
    new TranspileError(`Cannot use both '@extension' and '@metaExtension' decorators on the same class.`, node);

export const InvalidNewExpressionOnExtension = (node: ts.Node) =>
    new TranspileError(`Cannot construct classes with decorator '@extension' or '@metaExtension'.`, node);

export const InvalidExportDeclaration = (declaration: ts.ExportDeclaration) =>
    new TranspileError("Encountered invalid export declaration without exports and without module.", declaration);

export const InvalidExtendsExtension = (node: ts.Node) =>
    new TranspileError(`Cannot extend classes with decorator '@extension' or '@metaExtension'.`, node);

export const InvalidExportsExtension = (node: ts.Node) =>
    new TranspileError(`Cannot export classes with decorator '@extension' or '@metaExtension'.`, node);

export const InvalidInstanceOfExtension = (node: ts.Node) =>
    new TranspileError(`Cannot use instanceof on classes with decorator '@extension' or '@metaExtension'.`, node);

export const InvalidJsonFileContent = (node: ts.Node) => new TranspileError("Invalid JSON file content", node);

export const InvalidPropertyCall = (node: ts.Node) =>
    new TranspileError(`Tried to transpile a non-property call as property call.`, node);

export const InvalidElementCall = (node: ts.Node) =>
    new TranspileError(`Tried to transpile a non-element call as an element call.`, node);

export const InvalidThrowExpression = (node: ts.Node) =>
    new TranspileError(`Invalid throw expression, only strings can be thrown.`, node);

export const ForbiddenStaticClassPropertyName = (node: ts.Node, name: string) =>
    new TranspileError(`Cannot use "${name}" as a static class property or method name.`, node);

export const MissingClassName = (node: ts.Node) => new TranspileError(`Class declarations must have a name.`, node);

export const MissingForOfVariables = (node: ts.Node) =>
    new TranspileError("Transpiled ForOf variable declaration list contains no declarations.", node);

export const MissingFunctionName = (declaration: ts.FunctionLikeDeclaration) =>
    new TranspileError("Unsupported function declaration without name.", declaration);

export const MissingMetaExtension = (node: ts.Node) =>
    new TranspileError(`@metaExtension requires the extension of the metatable class.`, node);

export const NonFlattenableDestructure = (node: ts.Node) =>
    new TranspileError(`This node cannot be destructured using a standard Lua assignment statement.`, node);

export const UndefinedFunctionDefinition = (functionSymbolId: number) =>
    new Error(`Function definition for function symbol ${functionSymbolId} is undefined.`);

export const UndefinedScope = () => new Error("Expected to pop a scope, but found undefined.");

export const UndefinedTypeNode = (node: ts.Node) => new TranspileError("Failed to resolve required type node.", node);

export const UnknownSuperType = (node: ts.Node) =>
    new TranspileError("Unable to resolve type of super expression.", node);

export const UnsupportedDefaultExport = (node: ts.Node) =>
    new TranspileError(`Default exports are not supported.`, node);

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
    if (name) {
        return new TranspileError(
            `Unable to convert function with a 'this' parameter to function "${name}" with no 'this'. ` +
                `To fix, wrap in an arrow function, or declare with 'this: void'.`,
            node
        );
    } else {
        return new TranspileError(
            `Unable to convert function with a 'this' parameter to function with no 'this'. ` +
                `To fix, wrap in an arrow function, or declare with 'this: void'.`,
            node
        );
    }
};

export const UnsupportedSelfFunctionConversion = (node: ts.Node, name?: string) => {
    if (name) {
        return new TranspileError(
            `Unable to convert function with no 'this' parameter to function "${name}" with 'this'. ` +
                `To fix, wrap in an arrow function or declare with 'this: any'.`,
            node
        );
    } else {
        return new TranspileError(
            `Unable to convert function with no 'this' parameter to function with 'this'. ` +
                `To fix, wrap in an arrow function or declare with 'this: any'.`,
            node
        );
    }
};

export const UnsupportedOverloadAssignment = (node: ts.Node, name?: string) => {
    if (name) {
        return new TranspileError(
            `Unsupported assignment of function with different overloaded types for 'this' to "${name}". ` +
                `Overloads should all have the same type for 'this'.`,
            node
        );
    } else {
        return new TranspileError(
            `Unsupported assignment of function with different overloaded types for 'this'. ` +
                `Overloads should all have the same type for 'this'.`,
            node
        );
    }
};

export const UnsupportedNonDestructuringLuaIterator = (node: ts.Node) => {
    return new TranspileError(
        "Unsupported use of lua iterator with TupleReturn decorator in for...of statement. " +
            "You must use a destructuring statement to catch results from a lua iterator with " +
            "the TupleReturn decorator.",
        node
    );
};

export const UnresolvableRequirePath = (node: ts.Node, reason: string, path?: string) => {
    return new TranspileError(`${reason}. ` + `TypeScript path: ${path}.`, node);
};

export const ReferencedBeforeDeclaration = (node: ts.Identifier) => {
    return new TranspileError(
        `Identifier "${node.text}" was referenced before it was declared. The declaration ` +
            "must be moved before the identifier's use, or hoisting must be enabled.",
        node
    );
};

export const UnsupportedObjectDestructuringInForOf = (node: ts.Node) => {
    return new TranspileError(`Unsupported object destructuring in for...of statement.`, node);
};

export const InvalidAmbientIdentifierName = (node: ts.Identifier) => {
    return new TranspileError(
        `Invalid ambient identifier name "${node.text}". Ambient identifiers must be valid lua identifiers.`,
        node
    );
};

export const InvalidForRangeCall = (node: ts.Node, message: string) => {
    return new TranspileError(`Invalid @forRange call: ${message}`, node);
};
