import * as ts from "typescript";
import { createSerialDiagnosticFactory, createDiagnosticFactoryWithCode } from "../utils";

export const tstlOptionsAreMovingToTheTstlObject = createSerialDiagnosticFactory((tstl: Record<string, any>) => ({
    category: ts.DiagnosticCategory.Warning,
    messageText:
        'TSTL options are moving to the "tstl" object. Adjust your tsconfig to look like\n' +
        `"tstl": ${JSON.stringify(tstl, undefined, 4)}`,
}));

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

const createCommandLineError = <TArgs extends any[]>(code: number, getMessage: (...args: TArgs) => string) =>
    createDiagnosticFactoryWithCode(code, (...args: TArgs) => ({ messageText: getMessage(...args) }));

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
