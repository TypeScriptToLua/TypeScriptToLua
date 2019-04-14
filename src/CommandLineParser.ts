import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, LuaLibImportKind, LuaTarget } from "./CompilerOptions";
import * as diagnostics from "./diagnostics";

export interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}

interface CommandLineOptionBase {
    describe: string;
    aliases?: string[];
}

interface CommandLineOptionOfEnum extends CommandLineOptionBase {
    type: "enum";
    choices: string[];
}

interface CommandLineOptionOfBoolean extends CommandLineOptionBase {
    type: "boolean";
}

type CommandLineOption = CommandLineOptionOfEnum | CommandLineOptionOfBoolean;
const optionDeclarations: Record<string, CommandLineOption> = {
    luaLibImport: {
        describe: "Specifies how js standard features missing in lua are imported.",
        type: "enum",
        choices: Object.values(LuaLibImportKind),
    },
    luaTarget: {
        aliases: ["lt"],
        describe: "Specify Lua target version.",
        type: "enum",
        choices: Object.values(LuaTarget),
    },
    noHeader: {
        describe: "Specify if a header will be added to compiled files.",
        type: "boolean",
    },
    noHoisting: {
        describe: "Disables hoisting.",
        type: "boolean",
    },
    sourceMapTraceback: {
        describe: "Applies the source map to show source TS files and lines in error tracebacks.",
        type: "boolean",
    },
};

export const version = `Version ${require("../package.json").version}`;

const helpString =
    "Syntax:   tstl [options] [files...]\n\n" +

    "Examples: tstl path/to/file.ts [...]\n" +
    "          tstl -p path/to/tsconfig.json\n\n" +

    "In addition to the options listed below you can also pass options\n" +
    "for the typescript compiler (For a list of options use tsc -h).\n" +
    "Some tsc options might have no effect.";

export function getHelpString(): string {
    let result = helpString + "\n\n";

    result += "Options:\n";
    for (const [optionName, option] of Object.entries(optionDeclarations)) {
        const aliasStrings = (option.aliases || []).map(a => "-" + a);

        const optionString = aliasStrings.concat(["--" + optionName]).join("|");

        const parameterDescribe = option.type === "enum" ? option.choices.join("|") : option.type;

        const spacing = " ".repeat(Math.max(1, 45 - optionString.length - parameterDescribe.length));

        result += `\n ${optionString} <${parameterDescribe}>${spacing}${option.describe}\n`;
    }

    return result;
}

export function updateParsedConfigFile(parsedConfigFile: ts.ParsedCommandLine): ParsedCommandLine {
    for (const key in parsedConfigFile.raw) {
        const option = optionDeclarations[key];
        if (!option) continue;

        const value = readValue(parsedConfigFile.raw[key], option.type);
        if (option.type === "enum" && !option.choices.includes(value as string)) {
            parsedConfigFile.errors.push(
                diagnostics.argumentForOptionMustBe(key, option.choices.join(", "))
            );
        } else {
            // console.warn(`[Deprectated] TSTL options are moving to the luaConfig object. Adjust your tsconfig to `
            //    + `look like { "compilerOptions": { <typescript options> }, "tstl": { <tstl options> } }`);
            if (parsedConfigFile.options[key] === undefined) {
                parsedConfigFile.options[key] = value;
            }
        }
    }

    // Eventually we will only look for the tstl object for tstl options
    if (parsedConfigFile.raw.tstl) {
        for (const key in parsedConfigFile.raw.tstl) {
            const option = optionDeclarations[key];
            if (!option) continue;

            const value = readValue(parsedConfigFile.raw.tstl[key], option.type);
            if (option.type === "enum" && !option.choices.includes(value as string)) {
                parsedConfigFile.errors.push(
                    diagnostics.argumentForOptionMustBe(key, option.choices.join(", "))
                );
            } else {
                if (parsedConfigFile.options[key] === undefined) {
                    parsedConfigFile.options[key] = value;
                }
            }
        }
    }

    return parsedConfigFile;
}

export function parseCommandLine(args: string[]): ParsedCommandLine {
    const commandLine = updateParsedCommandLine(ts.parseCommandLine(args), args);

    // TODO: Remove
    if (commandLine.options.project && !commandLine.options.rootDir) {
        commandLine.options.rootDir = path.dirname(commandLine.options.project);
    }

    if (!commandLine.options.rootDir) {
        commandLine.options.rootDir = process.cwd();
    }

    if (!commandLine.options.outDir) {
        commandLine.options.outDir = commandLine.options.rootDir;
    }

    return commandLine;
}

function updateParsedCommandLine(
    parsedCommandLine: ts.ParsedCommandLine,
    args: string[]
): ParsedCommandLine {
    // Generate a list of valid option names and aliases
    const optionNames = Object.keys(optionDeclarations)
        .map(n => `--${n}`)
        .concat(...Object.values(optionDeclarations).map(o => (o.aliases || []).map(a => `-${a}`)));

    // Ignore errors caused by tstl specific compiler options
    const tsInvalidCompilerOptionErrorCode = 5023;
    parsedCommandLine.errors = parsedCommandLine.errors.filter(err => {
        return !(
            err.code === tsInvalidCompilerOptionErrorCode &&
            optionNames.some(optionName => String(err.messageText).endsWith(`'${optionName}'.`))
        );
    });

    for (let i = 0; i < args.length; i++) {
        if (!args[i].startsWith("-")) continue;

        const hasTwoDashes = args[i].startsWith("--");
        const parameterValue = args[i].substr(hasTwoDashes ? 2 : 1);
        let argumentName = optionDeclarations[parameterValue] && parameterValue;
        if (!hasTwoDashes && argumentName === undefined) {
            for (const key in optionDeclarations) {
                if ((optionDeclarations[key].aliases || []).includes(parameterValue)) {
                    argumentName = key;
                    break;
                }
            }
        }

        if (argumentName !== undefined) {
            const argumentResult = getArgumentValue(argumentName, i, args);
            if (argumentResult.isValid === true) {
                parsedCommandLine.options[argumentName] = argumentResult.result;
                // Skip value from being considered as option
                i += argumentResult.increment;
            } else {
                parsedCommandLine.errors.push(argumentResult.error);
            }
        }
    }

    return parsedCommandLine;
}

type ArgumentParseResult =
    | { isValid: true; result: string | boolean; increment: number }
    | { isValid: false; error: ts.Diagnostic };

function getArgumentValue(
    argumentName: string,
    argumentIndex: number,
    args: string[]
): ArgumentParseResult {
    const option = optionDeclarations[argumentName];
    const argument = args[argumentIndex + 1];

    if (option.type === "boolean" && (argument === undefined || argument.startsWith("-"))) {
        // Set boolean arguments without supplied value to true
        return { isValid: true, result: true, increment: 0 };
    }

    if (argument === undefined) {
        return { isValid: false, error: diagnostics.compilerOptionExpectsAnArgument(argumentName) };
    }

    const value = readValue(argument, option.type);

    if (option.type === "enum" && option.choices && !option.choices.includes(value as string)) {
        return {
            isValid: false,
            error: diagnostics.argumentForOptionMustBe(
                `--${argumentName}`,
                option.choices.join(", ")
            ),
        };
    }

    return { isValid: true, result: value, increment: 1 };
}

function readValue(value: string | boolean, type: CommandLineOption["type"]): string | boolean {
    if (type === "boolean") {
        return value === true || value === "true" || value === "t";
    } else if (type === "enum") {
        return value.toString().toLowerCase();
    }
}

export function parseConfigFileWithSystem(
    configFileName: string,
    commandLineOptions: CompilerOptions,
    system = ts.sys
): ParsedCommandLine {
    const { config, error } = ts.readConfigFile(configFileName, system.readFile);
    if (error) return { options: {}, fileNames: [], errors: [error] };

    const parsedConfigFile = ts.parseJsonConfigFileContent(
        config,
        system,
        path.dirname(configFileName),
        commandLineOptions,
        configFileName
    );

    return updateParsedConfigFile(parsedConfigFile);
}
