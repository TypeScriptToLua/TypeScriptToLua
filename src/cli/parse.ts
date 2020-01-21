import * as ts from "typescript";
import { CompilerOptions, LuaLibImportKind, LuaTarget } from "../CompilerOptions";
import * as cliDiagnostics from "./diagnostics";

export interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}

interface CommandLineOptionBase {
    name: string;
    aliases?: string[];
    description: string;
}

interface CommandLineOptionOfEnum extends CommandLineOptionBase {
    type: "enum";
    choices: string[];
}

interface CommandLineOptionOfBoolean extends CommandLineOptionBase {
    type: "boolean";
}

interface CommandLineOptionOfString extends CommandLineOptionBase {
    type: "string";
}

type CommandLineOption = CommandLineOptionOfEnum | CommandLineOptionOfBoolean | CommandLineOptionOfString;

export const optionDeclarations: CommandLineOption[] = [
    {
        name: "luaBundle",
        description: "The name of the lua file to bundle output lua to. Requires luaBundleEntry.",
        type: "string",
    },
    {
        name: "luaBundleEntry",
        description: "The entry *.ts file that will be executed when entering the luaBundle. Requires luaBundle.",
        type: "string",
    },
    {
        name: "luaLibImport",
        description: "Specifies how js standard features missing in lua are imported.",
        type: "enum",
        choices: Object.values(LuaLibImportKind),
    },
    {
        name: "luaTarget",
        aliases: ["lt"],
        description: "Specify Lua target version.",
        type: "enum",
        choices: Object.values(LuaTarget),
    },
    {
        name: "noImplicitSelf",
        description: 'If "this" is implicitly considered an any type, do not generate a self parameter.',
        type: "boolean",
    },
    {
        name: "noHeader",
        description: "Specify if a header will be added to compiled files.",
        type: "boolean",
    },
    {
        name: "sourceMapTraceback",
        description: "Applies the source map to show source TS files and lines in error tracebacks.",
        type: "boolean",
    },
];

export function updateParsedConfigFile(parsedConfigFile: ts.ParsedCommandLine): ParsedCommandLine {
    let hasRootLevelOptions = false;
    for (const key in parsedConfigFile.raw) {
        const option = optionDeclarations.find(option => option.name === key);
        if (!option) continue;

        if (parsedConfigFile.raw.tstl === undefined) parsedConfigFile.raw.tstl = {};
        parsedConfigFile.raw.tstl[key] = parsedConfigFile.raw[key];
        hasRootLevelOptions = true;
    }

    if (parsedConfigFile.raw.tstl) {
        if (hasRootLevelOptions) {
            parsedConfigFile.errors.push(cliDiagnostics.tstlOptionsAreMovingToTheTstlObject(parsedConfigFile.raw.tstl));
        }

        for (const key in parsedConfigFile.raw.tstl) {
            const option = optionDeclarations.find(option => option.name === key);
            if (!option) {
                parsedConfigFile.errors.push(cliDiagnostics.unknownCompilerOption(key));
                continue;
            }

            const { error, value } = readValue(option, parsedConfigFile.raw.tstl[key]);
            if (error) parsedConfigFile.errors.push(error);
            if (parsedConfigFile.options[key] === undefined) parsedConfigFile.options[key] = value;
        }
    }

    return parsedConfigFile;
}

export function parseCommandLine(args: string[]): ParsedCommandLine {
    return updateParsedCommandLine(ts.parseCommandLine(args), args);
}

function updateParsedCommandLine(parsedCommandLine: ts.ParsedCommandLine, args: string[]): ParsedCommandLine {
    for (let i = 0; i < args.length; i++) {
        if (!args[i].startsWith("-")) continue;

        const isShorthand = !args[i].startsWith("--");
        const argumentName = args[i].substr(isShorthand ? 1 : 2);
        const option = optionDeclarations.find(option => {
            if (option.name.toLowerCase() === argumentName.toLowerCase()) return true;
            if (isShorthand && option.aliases) {
                return option.aliases.some(a => a.toLowerCase() === argumentName.toLowerCase());
            }

            return false;
        });

        if (option) {
            // Ignore errors caused by tstl specific compiler options
            const tsInvalidCompilerOptionErrorCode = 5023;
            parsedCommandLine.errors = parsedCommandLine.errors.filter(error => {
                return !(
                    error.code === tsInvalidCompilerOptionErrorCode &&
                    String(error.messageText).endsWith(`'${args[i]}'.`)
                );
            });

            const { error, value, increment } = readCommandLineArgument(option, args[i + 1]);
            if (error) parsedCommandLine.errors.push(error);
            parsedCommandLine.options[option.name] = value;
            i += increment;
        }
    }

    return parsedCommandLine;
}

interface CommandLineArgument extends ReadValueResult {
    increment: number;
}

function readCommandLineArgument(option: CommandLineOption, value: any): CommandLineArgument {
    if (option.type === "boolean") {
        if (value === "true" || value === "false") {
            value = value === "true";
        } else {
            // Set boolean arguments without supplied value to true
            return { value: true, increment: 0 };
        }
    }

    if (value === undefined) {
        return {
            error: cliDiagnostics.compilerOptionExpectsAnArgument(option.name),
            value: undefined,
            increment: 0,
        };
    }

    return { ...readValue(option, value), increment: 1 };
}

interface ReadValueResult {
    error?: ts.Diagnostic;
    value: any;
}

function readValue(option: CommandLineOption, value: unknown): ReadValueResult {
    if (value === null) return { value };

    switch (option.type) {
        case "string":
        case "boolean": {
            if (typeof value !== option.type) {
                return {
                    value: undefined,
                    error: cliDiagnostics.compilerOptionRequiresAValueOfType(option.name, option.type),
                };
            }

            return { value };
        }

        case "enum": {
            if (typeof value !== "string") {
                return {
                    value: undefined,
                    error: cliDiagnostics.compilerOptionRequiresAValueOfType(option.name, "string"),
                };
            }

            const enumValue = option.choices.find(c => c.toLowerCase() === value.toLowerCase());
            if (enumValue === undefined) {
                const optionChoices = option.choices.join(", ");
                return {
                    value: undefined,
                    error: cliDiagnostics.argumentForOptionMustBe(`--${option.name}`, optionChoices),
                };
            }

            return { value: enumValue };
        }
    }
}
