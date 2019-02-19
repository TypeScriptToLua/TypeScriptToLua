import * as ts from "typescript";

import {TranspileError} from "./TranspileError";
import {TSHelper as tsHelper} from "./TSHelper";

export class TSTLErrors {
    public static CouldNotFindEnumMember = (enumDeclaration: ts.EnumDeclaration, enumMember: string, node: ts.Node) =>
        new TranspileError(`Could not find ${enumMember} in ${enumDeclaration.name.text}`, node);

    public static DefaultImportsNotSupported = (node: ts.Node) =>
        new TranspileError(`Default Imports are not supported, please use named imports instead!`, node);

    public static ForbiddenEllipsisDestruction = (node: ts.Node) =>
        new TranspileError(`Ellipsis destruction is not allowed.`, node);

    public static ForbiddenForIn = (node: ts.Node) =>
        new TranspileError(`Iterating over arrays with 'for ... in' is not allowed.`, node);

    public static HeterogeneousEnum = (node: ts.Node) => new TranspileError(
        `Invalid heterogeneous enum. Enums should either specify no member values, ` +
            `or specify values (of the same type) for all members.`,
        node);

    public static InvalidDecoratorArgumentNumber = (name: string, got: number, expected: number, node: ts.Node) =>
        new TranspileError(`${name} expects ${expected} argument(s) but got ${got}.`, node);

    public static InvalidExtensionMetaExtension = (node: ts.Node) =>
        new TranspileError(`Cannot use both '@extension' and '@metaExtension' decorators on the same class.`, node);

    public static InvalidNewExpressionOnExtension = (node: ts.Node) =>
        new TranspileError(`Cannot construct classes with decorator '@extension' or '@metaExtension'.`, node);

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

    public static MissingMetaExtension = (node: ts.Node) =>
        new TranspileError(`@metaExtension requires the extension of the metatable class.`, node);

    public static UnsupportedDefaultExport = (node: ts.Node) =>
        new TranspileError(`Default exports are not supported.`, node);

    public static UnsupportedImportType = (node: ts.Node) =>
        new TranspileError(`Unsupported import type.`, node);

    public static UnsupportedKind = (description: string, kind: ts.SyntaxKind, node: ts.Node) =>
        {
            const kindName = tsHelper.enumName(kind, ts.SyntaxKind);
            return new TranspileError(`Unsupported ${description} kind: ${kindName}`, node);
        };

    public static UnsupportedProperty = (parentName: string, property: string, node: ts.Node) =>
        new TranspileError(`Unsupported property on ${parentName}: ${property}`, node);

    public static UnsupportedForTarget = (functionality: string, version: string, node: ts.Node) =>
        new TranspileError(`${functionality} is/are not supported for target Lua ${version}.`, node);

    public static UnsupportedFunctionConversion = (node: ts.Node, name?: string) => {
        if (name) {
            return new TranspileError(
                `Unsupported conversion from method to function "${name}". ` +
                    `To fix, wrap the method in an arrow function.`,
                node);
        } else {
            return new TranspileError(
                `Unsupported conversion from method to function. ` +
                    `To fix, wrap the method in an arrow function.`,
                node);
        }
    };

    public static UnsupportedMethodConversion = (node: ts.Node, name?: string) => {
        if (name) {
            return new TranspileError(
                `Unsupported conversion from function to method "${name}". ` +
                    `To fix, wrap the function in an arrow function or declare the function with` +
                    ` an explicit 'this' parameter.`,
                node);
        } else {
            return new TranspileError(
                `Unsupported conversion from function to method. ` +
                    `To fix, wrap the function in an arrow function or declare the function with` +
                    ` an explicit 'this' parameter.`,
                node);
        }
    };

    public static UnsupportedOverloadAssignment = (node: ts.Node, name?: string) => {
        if (name) {
            return new TranspileError(
                `Unsupported assignment of mixed function/method overload to "${name}". ` +
                    `Overloads should either be all functions or all methods, but not both.`,
                node);
        } else {
            return new TranspileError(
                `Unsupported assignment of mixed function/method overload. ` +
                    `Overloads should either be all functions or all methods, but not both.`,
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
