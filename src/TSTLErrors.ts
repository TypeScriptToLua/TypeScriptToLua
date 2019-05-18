import * as ts from "typescript";
import { TranspileError } from "./TranspileError";
import { LuaTarget } from "./CompilerOptions";

const getLuaTargetName = (version: LuaTarget) =>
    version === LuaTarget.LuaJIT ? "LuaJIT" : `Lua ${version}`;

export class TSTLErrors {
    public static CouldNotCast = (castName: string) =>
        new Error(`Failed to cast all elements to expected type using ${castName}.`);

    public static CouldNotFindEnumMember = (enumDeclaration: ts.EnumDeclaration, enumMember: string, node: ts.Node) =>
        new TranspileError(`Could not find ${enumMember} in ${enumDeclaration.name.text}`, node);

    public static DefaultImportsNotSupported = (node: ts.Node) =>
        new TranspileError(`Default Imports are not supported, please use named imports instead!`, node);

    public static ForbiddenEllipsisDestruction = (node: ts.Node) =>
        new TranspileError(`Ellipsis destruction is not allowed.`, node);

    public static ForbiddenForIn = (node: ts.Node) =>
        new TranspileError(`Iterating over arrays with 'for ... in' is not allowed.`, node);

    public static ForbiddenLuaTableSetExpression = (node: ts.Node) => new TranspileError(
        `A '@luaTable' object's 'set()' method can only be used as a Statement, not an Expression.`,
        node);

    public static ForbiddenLuaTableNonDeclaration = (node: ts.Node) =>
        new TranspileError(`Classes with the '@luaTable' decorator must be declared.`, node);

    public static InvalidExtendsLuaTable = (node: ts.Node) =>
        new TranspileError(`Cannot extend classes with the decorator '@luaTable'.`, node);

    public static InvalidInstanceOfLuaTable = (node: ts.Node) =>
        new TranspileError(`The instanceof operator cannot be used with a '@luaTable' class.`, node);

    public static ForbiddenLuaTableUseException = (description: string, node: ts.Node) =>
        new TranspileError(`Invalid @luaTable usage: ${description}`, node);

    public static HeterogeneousEnum = (node: ts.Node) => new TranspileError(
        `Invalid heterogeneous enum. Enums should either specify no member values, ` +
            `or specify values (of the same type) for all members.`,
        node);

    public static InvalidDecoratorArgumentNumber = (name: string, got: number, expected: number, node: ts.Node) =>
        new TranspileError(`${name} expects ${expected} argument(s) but got ${got}.`, node);

    public static InvalidDecoratorContext = (node: ts.Node) =>
        new TranspileError(`Decorator function cannot have 'this: void'.`, node);

    public static InvalidExtensionMetaExtension = (node: ts.Node) =>
        new TranspileError(`Cannot use both '@extension' and '@metaExtension' decorators on the same class.`, node);

    public static InvalidNewExpressionOnExtension = (node: ts.Node) =>
        new TranspileError(`Cannot construct classes with decorator '@extension' or '@metaExtension'.`, node);

    public static InvalidExportDeclaration = (declaration: ts.ExportDeclaration) =>
        new TranspileError("Encountered invalid export declaration without exports and without module.", declaration);

    public static InvalidExtendsExtension = (node: ts.Node) =>
        new TranspileError(`Cannot extend classes with decorator '@extension' or '@metaExtension'.`, node);

    public static InvalidExportsExtension = (node: ts.Node) =>
        new TranspileError(`Cannot export classes with decorator '@extension' or '@metaExtension'.`, node);

    public static InvalidInstanceOfExtension = (node: ts.Node) =>
        new TranspileError(`Cannot use instanceof on classes with decorator '@extension' or '@metaExtension'.`, node);

    public static InvalidJsonFileContent = (node: ts.Node) =>
        new TranspileError("Invalid JSON file content", node);

    public static InvalidPropertyCall = (node: ts.Node) =>
        new TranspileError(`Tried to transpile a non-property call as property call.`, node);

    public static InvalidElementCall = (node: ts.Node) =>
        new TranspileError(`Tried to transpile a non-element call as an element call.`, node);

    public static InvalidThrowExpression = (node: ts.Node) =>
        new TranspileError(`Invalid throw expression, only strings can be thrown.`, node);

    public static KeywordIdentifier = (node: ts.Identifier) =>
        new TranspileError(`Cannot use Lua keyword ${node.escapedText} as identifier.`, node);

    public static MissingClassName = (node: ts.Node) =>
        new TranspileError(`Class declarations must have a name.`, node);

    public static MissingForOfVariables = (node: ts.Node) =>
        new TranspileError("Transpiled ForOf variable declaration list contains no declarations.", node);

    public static MissingFunctionName = (declaration: ts.FunctionLikeDeclaration) =>
        new TranspileError("Unsupported function declaration without name.", declaration);

    public static MissingMetaExtension = (node: ts.Node) =>
        new TranspileError(`@metaExtension requires the extension of the metatable class.`, node);

    public static MissingSourceFile = () =>
        new Error("Expected transformer.sourceFile to be set, but it isn't.");

    public static UndefinedFunctionDefinition = (functionSymbolId: number) =>
        new Error(`Function definition for function symbol ${functionSymbolId} is undefined.`);

    public static UndefinedScope = () =>
        new Error("Expected to pop a scope, but found undefined.");

    public static UndefinedTypeNode = (node: ts.Node) =>
        new TranspileError("Failed to resolve required type node.", node);

    public static UnknownSuperType = (node: ts.Node) =>
        new TranspileError("Unable to resolve type of super expression.", node);

    public static UnsupportedDefaultExport = (node: ts.Node) =>
        new TranspileError(`Default exports are not supported.`, node);

    public static UnsupportedImportType = (node: ts.Node) =>
        new TranspileError(`Unsupported import type.`, node);

    public static UnsupportedKind = (description: string, kind: ts.SyntaxKind, node: ts.Node) =>
        new TranspileError(`Unsupported ${description} kind: ${ts.SyntaxKind[kind]}`, node);

    public static UnsupportedProperty = (parentName: string, property: string, node: ts.Node) =>
        new TranspileError(`Unsupported property on ${parentName}: ${property}`, node);

    public static UnsupportedForTarget = (functionality: string, version: LuaTarget, node: ts.Node) =>
        new TranspileError(`${functionality} is/are not supported for target ${getLuaTargetName(version)}.`, node);

    public static UnsupportedFunctionWithoutBody = (node: ts.FunctionLikeDeclaration) =>
        new TranspileError("Functions with undefined bodies are not supported.", node);

    public static UnsupportedNoSelfFunctionConversion = (node: ts.Node, name?: string) => {
        if (name) {
            return new TranspileError(
                `Unable to convert function with a 'this' parameter to function "${name}" with no 'this'. ` +
                `To fix, wrap in an arrow function, or declare with 'this: void'.`,
                node);
        } else {
            return new TranspileError(
                `Unable to convert function with a 'this' parameter to function with no 'this'. ` +
                `To fix, wrap in an arrow function, or declare with 'this: void'.`,
                node);
        }
    };

    public static UnsupportedSelfFunctionConversion = (node: ts.Node, name?: string) => {
        if (name) {
            return new TranspileError(
                `Unable to convert function with no 'this' parameter to function "${name}" with 'this'. ` +
                `To fix, wrap in an arrow function or declare with 'this: any'.`,
                node);
        } else {
            return new TranspileError(
                `Unable to convert function with no 'this' parameter to function with 'this'. ` +
                `To fix, wrap in an arrow function or declare with 'this: any'.`,
                node);
        }
    };

    public static UnsupportedOverloadAssignment = (node: ts.Node, name?: string) => {
        if (name) {
            return new TranspileError(
                `Unsupported assignment of function with different overloaded types for 'this' to "${name}". ` +
                `Overloads should all have the same type for 'this'.`,
                node);
        } else {
            return new TranspileError(
                `Unsupported assignment of function with different overloaded types for 'this'. ` +
                `Overloads should all have the same type for 'this'.`,
                node);
        }
    };

    public static UnsupportedNonDestructuringLuaIterator = (node: ts.Node) => {
        return new TranspileError(
            "Unsupported use of lua iterator with TupleReturn decorator in for...of statement. " +
                "You must use a destructuring statement to catch results from a lua iterator with " +
                "the TupleReturn decorator.",
            node);
    };

    public static UnresolvableRequirePath = (node: ts.Node, reason: string, path?: string) => {
        return new TranspileError(
            `${reason}. ` +
            `TypeScript path: ${path}.`,
            node);
    };

    public static ReferencedBeforeDeclaration = (node: ts.Identifier) => {
        return new TranspileError(
            `Identifier "${node.text}" was referenced before it was declared. The declaration ` +
            "must be moved before the identifier's use, or hoisting must be enabled.",
            node
        );
    }
}
