import * as ts from "typescript";
import { TranspileError } from "./TranspileError";

export const transpileError = (error: TranspileError): ts.Diagnostic => ({
    file: error.node.getSourceFile(),
    start: error.node.getStart(),
    length: error.node.getWidth(),
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: error.message,
});

export const tstlOptionsAreMovingToTheTstlObject = (tstl: Record<string, any>): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Warning,
    code: 0,
    source: "typescript-to-lua",
    messageText:
        'TSTL options are moving to the "tstl" object. Adjust your tsconfig to look like\n' +
        `"tstl": ${JSON.stringify(tstl, undefined, 4)}`,
});

export const toLoadTransformerItShouldBeTranspiled = (transform: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `To load "${transform}" transformer it should be transpiled or "ts-node" should be installed`,
});

export const couldNotResolveTransformerFrom = (transform: string, base: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `Could not resolve "${transform}" transformer from "${base}".`,
});

export const transformerShouldHaveAExport = (transform: string, importName: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `"${transform}" transformer should have a "${importName}" export`,
});

export const transformerShouldBeATsTransformerFactory = (transform: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `"${transform}" transformer should be a ts.TransformerFactory or an object with ts.TransformerFactory values`,
});

export const watchErrorSummary = (errorCount: number): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Message,
    code: errorCount === 1 ? 6193 : 6194,
    messageText:
        errorCount === 1
            ? "Found 1 error. Watching for file changes."
            : `Found ${errorCount} errors. Watching for file changes.`,
});

const createCommandLineError = <Args extends any[]>(code: number, getMessage: (...args: Args) => string) => (
    ...args: Args
): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code,
    messageText: getMessage(...args),
});

export const unknownCompilerOption = createCommandLineError(
    5023,
    (name: string) => `Unknown compiler option '${name}'.`
);

export const compilerOptionRequiresAValueOfType = createCommandLineError(
    5024,
    (name: string, type: string) => `Compiler option '${name}' requires a value of type ${type}.`
);

export const optionProjectCannotBeMixedWithSourceFilesOnACommandLine = createCommandLineError(
    5042,
    () => "Option 'project' cannot be mixed with source files on a command line."
);

export const cannotFindATsconfigJsonAtTheSpecifiedDirectory = createCommandLineError(
    5057,
    (dir: string) => `Cannot find a tsconfig.json file at the specified directory: '${dir}'.`
);

export const theSpecifiedPathDoesNotExist = createCommandLineError(
    5058,
    (dir: string) => `The specified path does not exist: '${dir}'.`
);

export const compilerOptionExpectsAnArgument = createCommandLineError(
    6044,
    (name: string) => `Compiler option '${name}' expects an argument.`
);

export const argumentForOptionMustBe = createCommandLineError(
    6046,
    (name: string, values: string) => `Argument for '${name}' option must be: ${values}.`
);

export const optionCanOnlyBeSpecifiedInTsconfigJsonFile = createCommandLineError(
    6064,
    (name: string) => `Option '${name}' can only be specified in 'tsconfig.json' file.`
);

export const optionBuildMustBeFirstCommandLineArgument = createCommandLineError(
    6369,
    () => "Option '--build' must be the first command line argument."
);
