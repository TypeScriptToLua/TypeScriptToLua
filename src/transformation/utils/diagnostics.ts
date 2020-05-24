import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import { createSerialDiagnosticFactory } from "../../utils";
import { AnnotationKind } from "./annotations";

const createDiagnosticFactory = <TArgs extends any[]>(message: string | ((...args: TArgs) => string)) =>
    createSerialDiagnosticFactory((node: ts.Node, ...args: TArgs) => ({
        file: node.getSourceFile(),
        start: node.getStart(),
        length: node.getWidth(),
        messageText: typeof message === "string" ? message : message(...args),
    }));

export const unsupportedNodeKind = createDiagnosticFactory(
    (kind: ts.SyntaxKind) => `Unsupported node kind ${ts.SyntaxKind[kind]}`
);

export const forbiddenForIn = createDiagnosticFactory("Iterating over arrays with 'for ... in' is not allowed.");

export const unsupportedNoSelfFunctionConversion = createDiagnosticFactory((name?: string) => {
    const nameReference = name ? ` '${name}'` : "";
    return (
        `Unable to convert function with a 'this' parameter to function${nameReference} with no 'this'. ` +
        "To fix, wrap in an arrow function, or declare with 'this: void'."
    );
});

export const unsupportedSelfFunctionConversion = createDiagnosticFactory((name?: string) => {
    const nameReference = name ? ` '${name}'` : "";
    return (
        `Unable to convert function with no 'this' parameter to function${nameReference} with 'this'. ` +
        "To fix, wrap in an arrow function, or declare with 'this: any'."
    );
});

export const unsupportedOverloadAssignment = createDiagnosticFactory((name?: string) => {
    const nameReference = name ? ` to '${name}'` : "";
    return (
        `Unsupported assignment of function with different overloaded types for 'this'${nameReference}. ` +
        "Overloads should all have the same type for 'this'."
    );
});

export const decoratorInvalidContext = createDiagnosticFactory("Decorator function cannot have 'this: void'.");

export const annotationInvalidArgumentCount = createDiagnosticFactory(
    (kind: AnnotationKind, got: number, expected: number) => `'@${kind}' expects ${expected} arguments, but got ${got}.`
);

export const extensionCannotConstruct = createDiagnosticFactory(
    "Cannot construct classes with '@extension' or '@metaExtension' annotation."
);

export const extensionCannotExtend = createDiagnosticFactory(
    "Cannot extend classes with '@extension' or '@metaExtension' annotation."
);

export const extensionCannotExport = createDiagnosticFactory(
    "Cannot export classes with '@extension' or '@metaExtension' annotation."
);

export const extensionInvalidInstanceOf = createDiagnosticFactory(
    "Cannot use instanceof on classes with '@extension' or '@metaExtension' annotation."
);

export const extensionAndMetaExtensionConflict = createDiagnosticFactory(
    "Cannot use both '@extension' and '@metaExtension' annotations on the same class."
);

export const metaExtensionMissingExtends = createDiagnosticFactory(
    "'@metaExtension' annotation requires the extension of the metatable class."
);

export const invalidForRangeCall = createDiagnosticFactory((message: string) => `Invalid @forRange call: ${message}.`);

export const luaTableMustBeAmbient = createDiagnosticFactory(
    "Classes with the '@luaTable' annotation must be ambient."
);

export const luaTableCannotBeExtended = createDiagnosticFactory(
    "Cannot extend classes with the '@luaTable' annotation."
);

export const luaTableInvalidInstanceOf = createDiagnosticFactory(
    "The instanceof operator cannot be used with a '@luaTable' class."
);

export const luaTableCannotBeAccessedDynamically = createDiagnosticFactory("@luaTable cannot be accessed dynamically.");

export const luaTableForbiddenUsage = createDiagnosticFactory(
    (description: string) => `Invalid @luaTable usage: ${description}.`
);

export const luaIteratorForbiddenUsage = createDiagnosticFactory(
    "Unsupported use of lua iterator with '@tupleReturn' annotation in for...of statement. " +
        "You must use a destructuring statement to catch results from a lua iterator with " +
        "the '@tupleReturn' annotation."
);

export const unsupportedAccessorInObjectLiteral = createDiagnosticFactory(
    "Accessors in object literal are not supported."
);

export const unsupportedRightShiftOperator = createDiagnosticFactory(
    "Right shift operator is not supported for target Lua 5.3. Use `>>>` instead."
);

const getLuaTargetName = (version: LuaTarget) => (version === LuaTarget.LuaJIT ? "LuaJIT" : `Lua ${version}`);
export const unsupportedForTarget = createDiagnosticFactory(
    (functionality: string, version: Exclude<LuaTarget, LuaTarget.Universal>) =>
        `${functionality} is/are not supported for target ${getLuaTargetName(version)}.`
);

export const unsupportedProperty = createDiagnosticFactory(
    (parentName: string, property: string) => `${parentName}.${property} is unsupported.`
);

export const invalidAmbientIdentifierName = createDiagnosticFactory(
    (text: string) => `Invalid ambient identifier name '${text}'. Ambient identifiers must be valid lua identifiers.`
);

export const unresolvableRequirePath = createDiagnosticFactory(
    (path: string) => `Cannot create require path. Module '${path}' does not exist within --rootDir.`
);

export const unsupportedVarDeclaration = createDiagnosticFactory(
    "`var` declarations are not supported. Use `let` or `const` instead."
);
