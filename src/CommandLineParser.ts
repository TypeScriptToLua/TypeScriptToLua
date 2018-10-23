import { CompilerOptions } from "./CompilerOptions";

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import * as yargs from "yargs";

interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}

interface YargsOptions {
    [key: string]: yargs.Options;
}

export const optionDeclarations: YargsOptions = {
    luaLibImport: {
        choices: ["inline", "require", "none"],
        default: "inline",
        describe: "Specifies how js standard features missing in lua are imported.",
        type: "string",
    },
    luaTarget: {
        alias: "lt",
        choices: ["JIT", "5.3", "5.2", "5.1"],
        default: "JIT",
        describe: "Specify Lua target version.",
        type: "string",
    },
    noHeader: {
        default: false,
        describe: "Specify if a header will be added to compiled files.",
        type: "boolean",
    },
};

class CLIError extends Error {

}

/**
 * Removes defaults from the arguments.
 * Returns a tuple where [0] is a copy of the options without defaults and [1] is the extracted defaults.
 */
function getYargOptionsWithoutDefaults(options: YargsOptions): [YargsOptions, yargs.Arguments] {
    // options is a deep object, Object.assign or {...options} still keeps the referece
    const copy = JSON.parse(JSON.stringify(options));

    const optionDefaults: yargs.Arguments = {_: null, $0: null};
    for (const optionName in copy) {
        const section = copy[optionName];

        optionDefaults[optionName] = section.default;
        delete section.default;
    }

    return [copy, optionDefaults];
}

/**
 * Pares the supplied arguments.
 * The result will include arguments supplied via CLI and arguments from tsconfig.
 */
export function parseCommandLine(args: string[]): ParsedCommandLine {
    // Get a copy of the options without defaults to prevent defaults overriding project config
    const [tstlOptions, tstlDefaults] = getYargOptionsWithoutDefaults(optionDeclarations);

    const parsedArgs = yargs
        .usage("Syntax: tstl [options] [files...]\n\n" +
            "In addition to the options listed below you can also pass options" +
            "for the typescript compiler (For a list of options use tsc -h).\n" +
            "Some tsc options might have no effect.")
        .example("tstl path/to/file.ts [...]", "Compile files")
        .example("tstl -p path/to/tsconfig.json", "Compile project")
        .wrap(yargs.terminalWidth())
        .options(tstlOptions)
        .fail((msg, err) => {
            throw new CLIError(msg);
        })
        .parse(args);

    let commandLine = ts.parseCommandLine(args);

    // Run diagnostics to check for invalid tsc/tstl options
    runDiagnostics(commandLine);

    // Add TSTL options from CLI
    addTSTLOptions(commandLine, parsedArgs);

    // Load config
    if (commandLine.options.project) {
        findConfigFile(commandLine);
        const configPath = commandLine.options.project;
        const configContents = fs.readFileSync(configPath).toString();
        const configJson = ts.parseConfigFileTextToJson(configPath, configContents);
        commandLine = ts.parseJsonConfigFileContent(
            configJson.config,
            ts.sys,
            path.dirname(configPath),
            commandLine.options
        );
    }

    // Add TSTL options from tsconfig
    addTSTLOptions(commandLine);

    // Add TSTL defaults last
    addTSTLOptions(commandLine, tstlDefaults);

    // Run diagnostics again to check for errors in tsconfig
    runDiagnostics(commandLine);

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

function addTSTLOptions(commandLine: ts.ParsedCommandLine,
                        additionalArgs?: yargs.Arguments,
                        forceOverride?: boolean): void {
    additionalArgs = additionalArgs ? additionalArgs : commandLine.raw;
    // Add compiler options that are ignored by TS parsers
    if (additionalArgs) {
        for (const arg in additionalArgs) {
            // dont override, this will prioritize CLI over tsconfig.
            if (optionDeclarations[arg] && (!commandLine.options[arg] || forceOverride)) {
                commandLine.options[arg] = additionalArgs[arg];
            }
        }
    }
}

/** Check the current state of the ParsedCommandLine for errors */
function runDiagnostics(commandLine: ts.ParsedCommandLine): void {
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
export function findConfigFile(commandLine: ts.ParsedCommandLine): void {
    if (!commandLine.options.project) {
        throw new CLIError(`error no base path provided, could not find config.`);
    }
    let configPath = commandLine.options.project;
    // If the project path is wrapped in double quotes, remove them
    if (/^".*"$/.test(configPath)) {
        configPath = configPath.substring(1, configPath.length - 1);
    }
    /* istanbul ignore if: Testing else part is not really possible via automated tests */
    if (!path.isAbsolute(configPath)) {
        // TODO check if commandLine.options.project can even contain non absolute paths
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
    commandLine.options.project = configPath;
}
