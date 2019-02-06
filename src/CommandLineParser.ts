import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import {CompilerOptions, LuaTarget, LuaLibImportKind} from "./CompilerOptions";

interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}

interface BaseCLIOption {
    alias: string | string[];
    describe: string;
    type: string;
}

interface CLIOption<T> extends BaseCLIOption {
    choices: T[];
    default: T;
}

export const optionDeclarations: {[key: string]: CLIOption<any>} = {
    luaLibImport: {
        choices: [LuaLibImportKind.Inline, LuaLibImportKind.Require, LuaLibImportKind.Always, LuaLibImportKind.None],
        default: LuaLibImportKind.Inline,
        describe: "Specifies how js standard features missing in lua are imported.",
        type: "enum",
    } as CLIOption<string>,
    luaTarget: {
        alias: "lt",
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

const helpString =
    "Syntax: tstl [options] [files...]\n\n" +
    "In addition to the options listed below you can also pass options\n" +
    "for the typescript compiler (For a list of options use tsc -h).\n" +
    "Some tsc options might have no effect.";

const examples = [
    ["Compile files", "tstl path/to/file.ts [...]"],
    ["Compile project", "tstl -p path/to/tsconfig.json"],
];

class CLIError extends Error {}

/**
 * Parse the supplied arguments.
 * The result will include arguments supplied via CLI and arguments from tsconfig.
 */
export function parseCommandLine(args: string[]): ParsedCommandLine
{
    let commandLine = ts.parseCommandLine(args);

    // Run diagnostics to check for invalid tsc options
    runTsDiagnostics(commandLine);

    // This will add TS and TSTL options from a tsconfig
    commandLine = readTsConfig(commandLine);

    // Run diagnostics to check for invalid tsconfig
    runTsDiagnostics(commandLine);

    // Merge TSTL CLI options in (highest priority) will also set defaults if none specified
    commandLine = parseTSTLOptions(commandLine, args);

    if (commandLine.options.project && !commandLine.options.rootDir) {
        commandLine.options.rootDir = path.dirname(commandLine.options.project);
    }

    if (!commandLine.options.rootDir) {
        commandLine.options.rootDir = process.cwd();
    }

    if (!commandLine.options.outDir) {
        commandLine.options.outDir = commandLine.options.rootDir;
    }

    return commandLine as ParsedCommandLine;
}

export function getHelpString(): string {
    let result = helpString + "\n\n";

    if (examples.length > 0) {
        result += "Examples:\n";
        for (const [exampleName, example] of examples) {
            result += `    ${exampleName}: ${example}\n`;
        }
    }

    return result;
}

function readTsConfig(parsedCommandLine: ts.ParsedCommandLine): ts.ParsedCommandLine {
    const options = parsedCommandLine.options;

    // Load config
    if (options.project) {
        findConfigFile(options);
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
                const value = readValue(parsedJsonConfig.raw[key], option.type);
                if (option.choices) {
                    if (option.choices.indexOf(value) < 0) {
                        throw new CLIError(`Unknown ${key} value '${value}.\n'`
                            + `Accepted values: ${option.choices}`);
                    }
                }

                parsedJsonConfig.options[key] = value;
            }
        }
        return parsedJsonConfig;
    }
    return parsedCommandLine;
}

function parseTSTLOptions(commandLine: ts.ParsedCommandLine, args: string[]): ts.ParsedCommandLine {
    const result = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--")) {
            const argumentName = args[i].substr(2);
            const option = optionDeclarations[argumentName];
            if (option) {
                const value = readValue(args[i + 1], option.type);
                i++; // Skip the value from being considered as argument name

                if (option.choices) {
                    if (option.choices.indexOf(value) < 0) {
                        throw new CLIError(`Unknown ${argumentName} value '${value}.\n'`
                            + `Accepted values: ${option.choices}`);
                    }
                }

                result[argumentName] = value;
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
    return commandLine;
}

function readValue(valueString: string, valueType: string): any {
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
function runTsDiagnostics(commandLine: ts.ParsedCommandLine): void {
    // Remove files that dont exist
    commandLine.fileNames = commandLine.fileNames.filter(file => fs.existsSync(file) || fs.existsSync(file + ".ts"));

    const tsInvalidCompilerOptionErrorCode = 5023;
    if (commandLine.errors.length !== 0) {
        // Generate a list of valid option names and aliases
        const optionNames: string[] = [];
        for (const key of Object.keys(optionDeclarations)) {
            optionNames.push(key);
            const alias = optionDeclarations[key].alias;
            if (alias) {
                if (typeof alias === "string") {
                    optionNames.push(alias);
                } else {
                    optionNames.push(...alias);
                }
            }
        }

        commandLine.errors.forEach(err => {
            let ignore = false;
            // Ignore errors caused by tstl specific compiler options
            if (err.code === tsInvalidCompilerOptionErrorCode) {
                for (const optionName of optionNames) {
                    if (err.messageText.toString().indexOf(optionName) !== -1) {
                        ignore = true;
                    }
                }
                if (!ignore) {
                    throw new CLIError(`error TS${err.code}: ${err.messageText}`);
                }
            }
        });
    }
}

/** Find configFile, function from ts api seems to be broken? */
export function findConfigFile(options: ts.CompilerOptions): void {
    if (!options.project) {
        throw new CLIError(`error no base path provided, could not find config.`);
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
    options.project = configPath;
}
