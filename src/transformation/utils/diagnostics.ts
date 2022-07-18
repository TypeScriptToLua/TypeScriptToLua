import * as ts from "typescript";
import { LuaTarget, TypeScriptToLuaOptions } from "../../CompilerOptions";
import { createSerialDiagnosticFactory } from "../../utils";
import { AnnotationKind } from "./annotations";

type MessageProvider<TArgs extends any[]> = string | ((...args: TArgs) => string);

const createDiagnosticFactory = <TArgs extends any[]>(
    category: ts.DiagnosticCategory,
    message: MessageProvider<TArgs>
) =>
    createSerialDiagnosticFactory((node: ts.Node, ...args: TArgs) => ({
        file: ts.getOriginalNode(node).getSourceFile(),
        start: ts.getOriginalNode(node).getStart(),
        length: ts.getOriginalNode(node).getWidth(),
        messageText: typeof message === "string" ? message : message(...args),
        category,
    }));

const createErrorDiagnosticFactory = <TArgs extends any[]>(message: MessageProvider<TArgs>) =>
    createDiagnosticFactory(ts.DiagnosticCategory.Error, message);
const createWarningDiagnosticFactory = <TArgs extends any[]>(message: MessageProvider<TArgs>) =>
    createDiagnosticFactory(ts.DiagnosticCategory.Warning, message);

export const unsupportedNodeKind = createErrorDiagnosticFactory(
    (kind: ts.SyntaxKind) => `Unsupported node kind ${ts.SyntaxKind[kind]}`
);

export const forbiddenForIn = createErrorDiagnosticFactory("Iterating over arrays with 'for ... in' is not allowed.");

export const unsupportedNoSelfFunctionConversion = createErrorDiagnosticFactory((name?: string) => {
    const nameReference = name ? ` '${name}'` : "";
    return (
        `Unable to convert function with a 'this' parameter to function${nameReference} with no 'this'. ` +
        "To fix, wrap in an arrow function, or declare with 'this: void'."
    );
});

export const unsupportedSelfFunctionConversion = createErrorDiagnosticFactory((name?: string) => {
    const nameReference = name ? ` '${name}'` : "";
    return (
        `Unable to convert function with no 'this' parameter to function${nameReference} with 'this'. ` +
        "To fix, wrap in an arrow function, or declare with 'this: any'."
    );
});

export const unsupportedOverloadAssignment = createErrorDiagnosticFactory((name?: string) => {
    const nameReference = name ? ` to '${name}'` : "";
    return (
        `Unsupported assignment of function with different overloaded types for 'this'${nameReference}. ` +
        "Overloads should all have the same type for 'this'."
    );
});

export const decoratorInvalidContext = createErrorDiagnosticFactory("Decorator function cannot have 'this: void'.");

export const annotationInvalidArgumentCount = createErrorDiagnosticFactory(
    (kind: AnnotationKind, got: number, expected: number) => `'@${kind}' expects ${expected} arguments, but got ${got}.`
);

export const invalidRangeUse = createErrorDiagnosticFactory("$range can only be used in a for...of loop.");

export const invalidVarargUse = createErrorDiagnosticFactory(
    "$vararg can only be used in a spread element ('...$vararg') in global scope."
);

export const invalidRangeControlVariable = createErrorDiagnosticFactory(
    "For loop using $range must declare a single control variable."
);

export const invalidMultiIterableWithoutDestructuring = createErrorDiagnosticFactory(
    "LuaIterable with a LuaMultiReturn return value type must be destructured."
);

export const invalidPairsIterableWithoutDestructuring = createErrorDiagnosticFactory(
    "LuaPairsIterable type must be destructured in a for...of statement."
);

export const unsupportedAccessorInObjectLiteral = createErrorDiagnosticFactory(
    "Accessors in object literal are not supported."
);

export const unsupportedRightShiftOperator = createErrorDiagnosticFactory(
    "Right shift operator is not supported for target Lua 5.3. Use `>>>` instead."
);

type NonUniversalTarget = Exclude<LuaTarget, LuaTarget.Universal>;

const getLuaTargetName = (version: LuaTarget) => (version === LuaTarget.LuaJIT ? "LuaJIT" : `Lua ${version}`);
export const unsupportedForTarget = createErrorDiagnosticFactory(
    (functionality: string, version: NonUniversalTarget) =>
        `${functionality} is/are not supported for target ${getLuaTargetName(version)}.`
);

export const unsupportedForTargetButOverrideAvailable = createErrorDiagnosticFactory(
    (functionality: string, version: NonUniversalTarget, optionName: keyof TypeScriptToLuaOptions) =>
        `As a precaution, ${functionality} is/are not supported for target ${getLuaTargetName(
            version
        )} due to language features/limitations. ` +
        `However "--${optionName}" can be used to bypass this precaution. ` +
        "See https://typescripttolua.github.io/docs/configuration for more information."
);

export const unsupportedProperty = createErrorDiagnosticFactory(
    (parentName: string, property: string) => `${parentName}.${property} is unsupported.`
);

export const invalidAmbientIdentifierName = createErrorDiagnosticFactory(
    (text: string) => `Invalid ambient identifier name '${text}'. Ambient identifiers must be valid lua identifiers.`
);

export const unsupportedVarDeclaration = createErrorDiagnosticFactory(
    "`var` declarations are not supported. Use `let` or `const` instead."
);

export const invalidMultiFunctionUse = createErrorDiagnosticFactory(
    "The $multi function must be called in a return statement."
);

export const invalidMultiFunctionReturnType = createErrorDiagnosticFactory(
    "The $multi function cannot be cast to a non-LuaMultiReturn type."
);

export const invalidMultiTypeToNonArrayLiteral = createErrorDiagnosticFactory("Expected an array literal.");

export const invalidMultiTypeToEmptyPatternOrArrayLiteral = createErrorDiagnosticFactory(
    "There must be one or more elements specified here."
);

export const invalidMultiReturnAccess = createErrorDiagnosticFactory(
    "The LuaMultiReturn type can only be accessed via an element access expression of a numeric type."
);

export const invalidCallExtensionUse = createErrorDiagnosticFactory(
    "This function must be called directly and cannot be referred to."
);

export const annotationRemoved = createErrorDiagnosticFactory(
    (kind: AnnotationKind) =>
        `'@${kind}' has been removed and will no longer have any effect.` +
        `See https://typescripttolua.github.io/docs/advanced/compiler-annotations#${kind.toLowerCase()} for more information.`
);

export const annotationDeprecated = createWarningDiagnosticFactory(
    (kind: AnnotationKind) =>
        `'@${kind}' is deprecated and will be removed in a future update. Please update your code before upgrading to the next release, otherwise your project will no longer compile. ` +
        `See https://typescripttolua.github.io/docs/advanced/compiler-annotations#${kind.toLowerCase()} for more information.`
);

export const notAllowedOptionalAssignment = createErrorDiagnosticFactory(
    "The left-hand side of an assignment expression may not be an optional property access."
);

export const awaitMustBeInAsyncFunction = createErrorDiagnosticFactory(
    "Await can only be used inside async functions."
);

export const unsupportedBuiltinOptionalCall = createErrorDiagnosticFactory(
    "Optional calls are not supported for builtin or language extension functions."
);

export const unsupportedOptionalCompileMembersOnly = createErrorDiagnosticFactory(
    "Optional calls are not supported on enums marked with @compileMembersOnly."
);

export const undefinedInArrayLiteral = createErrorDiagnosticFactory(
    "Array literals may not contain undefined or null."
);
