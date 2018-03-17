import * as ts from "typescript";
import * as yargs from 'yargs';
import * as fs from "fs";
import * as path from "path";

// ES6 syntax broken
const dedent = require("dedent");

export interface CompilerOptions extends ts.CompilerOptions {
    addHeader?: boolean;
    luaTarget?: string;
    dontRequireLuaLib?: boolean;
}

export interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}

export class CLIError extends Error {

}

const optionDeclarations: { [key: string]: yargs.Options } = {
    'luaTarget': {
        alias: 'lt',
        choices: ['JIT', '5.3'],
        default: 'JIT',
        describe: 'Specify Lua target version.',
        type: 'string'
    },
    'addHeader': {
        alias: 'ah',
        describe: 'Specify if a header will be added to compiled files.',
        default: false,
        type: 'boolean'
    },
    'dontRequireLuaLib': {
        describe: 'Dont require lua library that enables advanced Typescipt/JS functionality.',
        default: false,
        type: 'boolean'
    },
};


/**
 * Pares the supplied arguments.
 * The result will include arguments supplied via CLI and arguments from tsconfig.
 */
export function parseCommandLine(args: string[]): ParsedCommandLine {
    const parsedArgs = yargs
        .usage(dedent(`Syntax: tstl [options] [files...]

            In addition to the options listed below you can also pass options for the typescript compiler (For a list of options use tsc -h).
            Some tsc options might have no effect.`))
        .example('tstl path/to/file.ts [...]', 'Compile files')
        .example('tstl -p path/to/tsconfig.json', 'Compile project')
        .wrap(yargs.terminalWidth())
        .options(optionDeclarations)
        .fail((msg, err) => {
            throw new CLIError(msg);
        })
        .parse(args)

    let commandLine = ts.parseCommandLine(args);

    // Run diagnostics to check for invalid tsc/tstl options
    runDiagnostics(commandLine);

    // Add TSTL options from CLI
    addTSTLOptions(commandLine, parsedArgs);

    // Load config
    if (commandLine.options.project) {
        findConfigFile(commandLine);
        let configPath = commandLine.options.project;
        let configContents = fs.readFileSync(configPath).toString();
        const configJson = ts.parseConfigFileTextToJson(configPath, configContents);
        commandLine = ts.parseJsonConfigFileContent(configJson.config, ts.sys, path.dirname(configPath), commandLine.options);
    }

    // Add TSTL options from tsconfig
    addTSTLOptions(commandLine);

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

    return <ParsedCommandLine>commandLine;
}

function addTSTLOptions(commandLine: ts.ParsedCommandLine, additionalArgs?: yargs.Arguments, forceOverride?: boolean) {
    additionalArgs = additionalArgs ? additionalArgs : commandLine.raw
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
function runDiagnostics(commandLine: ts.ParsedCommandLine) {
    const tsInvalidCompilerOptionErrorCode = 5023;

    if (commandLine.errors.length !== 0) {
        // Generate a list of valid option names and aliases
        let optionNames: string[] = [];
        for (let key in optionDeclarations) {
            optionNames.push(key);
            let alias = optionDeclarations[key].alias;
            if (alias) {
                if (typeof alias === "string") {
                    optionNames.push(alias);
                } else {
                    optionNames.push(...alias);
                }
            }
        }

        commandLine.errors.forEach((err) => {
            let ignore = false;
            // Ignore errors caused by tstl specific compiler options
            if (err.code == tsInvalidCompilerOptionErrorCode) {
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
function findConfigFile(commandLine: ts.ParsedCommandLine) {
    if (!commandLine.options.project) {
        return;
    }
    let configPath = path.isAbsolute(commandLine.options.project) ? commandLine.options.project : path.join(process.cwd(), commandLine.options.project);
    if (fs.statSync(configPath).isDirectory()) {
        configPath = path.join(configPath, 'tsconfig.json');
    } else if (fs.statSync(configPath).isFile() && path.extname(configPath) === ".ts") {
        // Search for tsconfig upwards in directory hierarchy starting from the file path
        let dir = path.dirname(configPath).split(path.sep);
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
