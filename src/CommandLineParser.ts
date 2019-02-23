import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import {CompilerOptions, LuaTarget, LuaLibImportKind} from "./CompilerOptions";

export type CLIParseResult = ParseResult<ParsedCommandLine>;

type ParseResult<T> =
    { isValid: true; result: T }
    | { isValid: false, errorMessage: string};

type ArgumentParseResult<T> =
    { isValid: true; result: T; increment?: number }
    | { isValid: false, errorMessage: string };

interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}

interface BaseCLIOption {
    aliases: string[];
    describe: string;
    type: string;
}

interface CLIOption<T> extends BaseCLIOption {
    choices: T[];
    default: T;
}

const optionDeclarations: {[key: string]: CLIOption<any>} = {
    luaLibImport: {
        choices: [LuaLibImportKind.Inline, LuaLibImportKind.Require, LuaLibImportKind.Always, LuaLibImportKind.None],
        default: LuaLibImportKind.Inline,
        describe: "Specifies how js standard features missing in lua are imported.",
        type: "enum",
    } as CLIOption<string>,
    luaTarget: {
        aliases: ["lt"],
        choices: [LuaTarget.LuaJIT, LuaTarget.Lua53, LuaTarget.Lua52, LuaTarget.Lua51],
        default: LuaTarget.LuaJIT,
        describe: "Specify Lua target version.",
        type: "enum",
    } as CLIOption<string>,
    noHeader: {
        default: false,
        describe: "Specify if a header will be added to compiled files.",
        type: "boolean",
    } as CLIOption<boolean>,
    noHoisting: {
        default: false,
        describe: "Disables hoisting.",
        type: "boolean",
    } as CLIOption<boolean>,
};

export const { version } = require("../package.json");

const helpString =
    `Version ${version}\n` +
    "Syntax:   tstl [options] [files...]\n\n" +

    "Examples: tstl path/to/file.ts [...]\n" +
    "          tstl -p path/to/tsconfig.json\n\n" +

    "In addition to the options listed below you can also pass options\n" +
    "for the typescript compiler (For a list of options use tsc -h).\n" +
    "Some tsc options might have no effect.";

/**
 * Parse the supplied arguments.
 * The result will include arguments supplied via CLI and arguments from tsconfig.
 */
export function parseCommandLine(args: string[]): CLIParseResult
{
    let commandLine = ts.parseCommandLine(args);

    // Run diagnostics to check for invalid tsc options
    const diagnosticsResult = runTsDiagnostics(commandLine);
    if (diagnosticsResult.isValid === false) {
        return diagnosticsResult;
    }

    // This will add TS and TSTL options from a tsconfig
    const configResult = readTsConfig(commandLine);
    if (configResult.isValid === true) {
        commandLine = configResult.result;
    } else {
        return { isValid: false, errorMessage: configResult.errorMessage };
    }

    // Run diagnostics to check for invalid tsconfig
    const diagnosticsResult2 = runTsDiagnostics(commandLine);
    if (diagnosticsResult2.isValid === false) {
        return diagnosticsResult2;
    }

    // Merge TSTL CLI options in (highest priority) will also set defaults if none specified
    const tstlCLIResult = parseTSTLOptions(commandLine, args);
    if (tstlCLIResult.isValid === true) {
        commandLine = tstlCLIResult.result;
    } else {
        return { isValid: false, errorMessage: tstlCLIResult.errorMessage };
    }

    if (commandLine.options.project && !commandLine.options.rootDir) {
        commandLine.options.rootDir = path.dirname(commandLine.options.project);
    }

    if (!commandLine.options.rootDir) {
        commandLine.options.rootDir = process.cwd();
    }

    if (!commandLine.options.outDir) {
        commandLine.options.outDir = commandLine.options.rootDir;
    }

    return { isValid: true, result: commandLine as ParsedCommandLine };
}

export function getHelpString(): string {
    let result = helpString + "\n\n";

    result += "Options:\n";
    for (const optionName in optionDeclarations) {
        const option = optionDeclarations[optionName];
        const aliasStrings = option.aliases
            ? option.aliases.map(a => "-" + a)
            : [];

        const optionString = aliasStrings.concat(["--" + optionName]).join("|");

        const parameterDescribe = option.choices
            ? option.choices.join("|")
            : option.type;

        const spacing = " ".repeat(Math.max(1, 45 - optionString.length - parameterDescribe.length));

        result += `\n ${optionString} <${parameterDescribe}>${spacing}${option.describe}\n`;
    }

    return result;
}

function readTsConfig(parsedCommandLine: ts.ParsedCommandLine): CLIParseResult
{
    const options = parsedCommandLine.options;

    // Load config
    if (options.project) {
        const findProjectPathResult = findConfigFile(options);
        if (findProjectPathResult.isValid === true) {
            options.project = findProjectPathResult.result;
        } else {
            return { isValid: false, errorMessage: findProjectPathResult.errorMessage };
        }

        const configPath = options.project;
        const configContents = fs.readFileSync(configPath).toString();
        const configJson = ts.parseConfigFileTextToJson(configPath, configContents);
        const parsedJsonConfig = ts.parseJsonConfigFileContent(
            configJson.config,
            ts.sys,
            path.dirname(configPath),
            options
        );

        for (const key in parsedJsonConfig.raw) {
            const option = optionDeclarations[key];
            if (option !== undefined) {
                const value = readValue(parsedJsonConfig.raw[key], option.type, key);
                if (option.choices) {
                    if (option.choices.indexOf(value) < 0) {
                        return {
                            isValid: false,
                            errorMessage: `Unknown ${key} value '${value}'.\nAccepted values: ${option.choices}`,
                        };
                    }
                }

                parsedJsonConfig.options[key] = value;
            }
        }
        return { isValid: true, result: parsedJsonConfig };
    }
    return { isValid: true, result: parsedCommandLine };
}

function parseTSTLOptions(commandLine: ts.ParsedCommandLine, args: string[]): CLIParseResult {
    const result = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--")) {
            const argumentName = args[i].substr(2);
            const option = optionDeclarations[argumentName];
            if (option) {
                const argumentResult = getArgumentValue(argumentName, i, args);
                if (argumentResult.isValid === true) {
                    result[argumentName] = argumentResult.result;
                    // Skip value from being considered as option
                    i += argumentResult.increment !== undefined ? argumentResult.increment : 1;
                } else {
                    return { isValid: false, errorMessage: argumentResult.errorMessage };
                }
            }
        } else if (args[i].startsWith("-")) {
            const argument = args[i].substr(1);
            let argumentName: string;
            for (const key in optionDeclarations) {
                if (optionDeclarations[key].aliases && optionDeclarations[key].aliases.indexOf(argument) >= 0) {
                    argumentName = key;
                    break;
                }
            }

            if (argumentName) {
                const argumentResult = getArgumentValue(argumentName, i, args);
                if (argumentResult.isValid === true) {
                    result[argumentName] = argumentResult.result;
                    // Skip value from being considered as option
                    i += argumentResult.increment !== undefined ? argumentResult.increment : 1;
                } else {
                    return { isValid: false, errorMessage: argumentResult.errorMessage };
                }
            }
        }
    }
    for (const option in result) {
        commandLine.options[option] = result[option];
    }
    // Add defaults if not set
    const defaultOptions = getDefaultOptions();
    for (const option in defaultOptions) {
        if (!commandLine.options[option]) {
            commandLine.options[option] = defaultOptions[option];
        }
    }
    return { isValid: true, result: commandLine };
}

function getArgumentValue(
    argumentName: string,
    argumentIndex: number,
    args: string[]
): ArgumentParseResult<string | boolean>
{
    const option = optionDeclarations[argumentName];
    const argument = args[argumentIndex + 1];

    if (option.type === "boolean" && (argument === undefined || argument.startsWith("-"))) {
        // Set boolean arguments without supplied value to true
        return { isValid: true, result: true, increment: 0 };
    }

    if (argument === undefined) {
        return { isValid: false, errorMessage: `Missing value for parameter ${argumentName}`};
    }

    const value = readValue(argument, option.type, argumentName);

    if (option.choices) {
        if (option.choices.indexOf(value) < 0) {
            return {
                isValid: false,
                errorMessage: `Unknown ${argumentName} value '${value}'. Accepted values are: ${option.choices}`,
            };
        }
    }

    return { isValid: true, result: value };
}

function readValue(valueString: string, valueType: string, parameterName: string): string | boolean {
    if (valueType === "boolean") {
        return valueString === "true" || valueString === "t"
            ? true
            : false;
    } else if (valueType === "enum") {
        return valueString.toLowerCase();
    } else {
        return valueString;
    }
}

function getDefaultOptions(): CompilerOptions {
    const options: CompilerOptions = {};

    for (const optionName in optionDeclarations) {
        if (optionDeclarations[optionName].default !== undefined) {
            options[optionName] = optionDeclarations[optionName].default;
        }
    }

    return options;
}

/** Check the current state of the ParsedCommandLine for errors */
function runTsDiagnostics(commandLine: ts.ParsedCommandLine): ParseResult<boolean> {
    // Remove files that dont exist
    commandLine.fileNames = commandLine.fileNames.filter(file => fs.existsSync(file) || fs.existsSync(file + ".ts"));

    const tsInvalidCompilerOptionErrorCode = 5023;
    if (commandLine.errors.length !== 0) {
        // Generate a list of valid option names and aliases
        const optionNames: string[] = [];
        for (const key of Object.keys(optionDeclarations)) {
            optionNames.push(key);
            const alias = optionDeclarations[key].aliases;
            if (alias) {
                if (typeof alias === "string") {
                    optionNames.push(alias);
                } else {
                    optionNames.push(...alias);
                }
            }
        }

        for (const err of commandLine.errors) {
            // Ignore errors caused by tstl specific compiler options
            if (err.code === tsInvalidCompilerOptionErrorCode) {
                let ignore = false;
                for (const optionName of optionNames) {
                    if (err.messageText.toString().indexOf(optionName) !== -1) {
                        ignore = true;
                        break;
                    }
                }

                if (!ignore) {
                    return { isValid: false, errorMessage: `error TS${err.code}: ${err.messageText}`};
                }
            }
        }
    }

    return { isValid: true, result: true };
}

/** Find configFile, function from ts api seems to be broken? */
export function findConfigFile(options: ts.CompilerOptions): ParseResult<string> {
    if (!options.project) {
        return { isValid: false, errorMessage: `error no base path provided, could not find config.`};
    }
    let configPath = options.project;
    // If the project path is wrapped in double quotes, remove them
    if (/^".*"$/.test(configPath)) {
        configPath = configPath.substring(1, configPath.length - 1);
    }
    /* istanbul ignore if: Testing else part is not really possible via automated tests */
    if (!path.isAbsolute(configPath)) {
        // TODO check if options.project can even contain non absolute paths
        configPath = path.join(process.cwd(), configPath);
    }
    if (fs.statSync(configPath).isDirectory()) {
        configPath = path.join(configPath, "tsconfig.json");
    } else if (fs.statSync(configPath).isFile() && path.extname(configPath) === ".ts") {
        // Search for tsconfig upwards in directory hierarchy starting from the file path
        const dir = path.dirname(configPath).split(path.sep);
        for (let i = dir.length; i > 0; i--) {
            const searchPath = dir.slice(0, i).join("/") + path.sep + "tsconfig.json";

            // If tsconfig.json was found, stop searching
            if (ts.sys.fileExists(searchPath)) {
                configPath = searchPath;
                break;
            }
        }
    }

    return { isValid: true, result: configPath };
}
