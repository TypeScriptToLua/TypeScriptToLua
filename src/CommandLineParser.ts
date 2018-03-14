import * as ts from "typescript";
import * as yargs from 'yargs';
import * as fs from "fs";
import * as path from "path";

// ES6 syntax broken
import dedent = require("dedent");

export interface CompilerOptions extends ts.CompilerOptions {
    addHeader?: boolean;
    luaTarget?: string;
}

export interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}

const optionDeclarations: { [key: string]: yargs.Options } = {
    'lt': {
        alias: 'luaTarget',
        choices: ['JIT', '5.3'],
        default: 'JIT',
        describe: 'Specify Lua target version.',
        type: 'string'
    },
    'ah': {
        alias: 'addHeader',
        describe: 'Specify if a header will be added to compiled files.',
        default: false,
        type: 'boolean'
    },
    'h': {
        alias: 'help'
    },
    'v': {
        alias: 'version'
    }
};


/**
 * Pares the supplied arguments.
 * The result will include arguments supplied via CLI and arguments from tsconfig.
 */
export function parseCommandLine(args: ReadonlyArray<string>) : ParsedCommandLine {
    const argv = yargs
        .usage(dedent(`tstl [options] [files...]

            In addition to the options listed below you can also pass options for the typescript compiler (For a list of options use tsc -h).

            NOTES:
            - The tsc options might have no effect.
            - Options in tsconfig.json are prioritized.`))
        .example('tstl path/to/file.ts [...]', 'Compile files')
        .example('tstl -p path/to/tsconfig.json', 'Compile project')
        .options(optionDeclarations)
        .argv;

    let commandLine = ts.parseCommandLine(args);

    // Run diagnostics to check for invalid tsc/tstl options
    runDiagnostics(commandLine);

    if (commandLine.options.project) {
        findConfigFile(commandLine);
        let configPath = commandLine.options.project;
        let configContents = fs.readFileSync(configPath).toString();
        const configJson = ts.parseConfigFileTextToJson(configPath, configContents);
        commandLine = ts.parseJsonConfigFileContent(configJson.config, ts.sys, path.dirname(configPath), commandLine.options);
    }

    // Add compiler options that are ignored by TS parsers
    for (const arg in commandLine.raw) {
        // we dont have to check if the options is vlaid becuase we already validated at this point.
        if (getOptionNameMap()[arg]) {
            commandLine.options[arg] = commandLine.raw[arg];
        }
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

    // Run diagnostics again to check for errors in tsconfig
    runDiagnostics(commandLine);

    return commandLine;
}

interface OptionNameMap {
    [key: string]: boolean
}

let optionNameMapCache: OptionNameMap;

/**
 * Gets a list of valid tstl options including aliases
 * That can be used for arguemtn checking.
 */
function getOptionNameMap(): OptionNameMap{
    if (optionNameMapCache) {
        return optionNameMapCache;
    }
    let optNameMap: OptionNameMap = {};
    for (let key in optionDeclarations) {
        optNameMap[key] = true
        let alias = optionDeclarations[key].alias;
        if (typeof alias === "string") {
            optNameMap[alias] = true;
        } else {
            alias.forEach((val) => optNameMap[val] = true);
        }
    }
    optionNameMapCache = optNameMap;
    return optNameMap;
}

/** Check the current state of the ParsedCommandLine for errors */
function runDiagnostics(commandLine: ts.ParsedCommandLine) {
    const tsInvalidCompilerOptionErrorCode = 5023;

    if (commandLine.errors.length !== 0) {
        commandLine.errors.forEach((err) => {
            let ignore = false;
            // Ignore errors caused by tstl specific compiler options
            if (err.code == tsInvalidCompilerOptionErrorCode) {
                for (const key in getOptionNameMap()) {
                    if (err.messageText.toString().indexOf(key) !== -1) {
                        ignore = true;
                    }
                }
            }

            if (!ignore) {
                console.log(`error TS${err.code}: ${err.messageText}`);
                process.exit(1);
            }
        });
    }
}

/** Find configFile, function form ts api seems to be broken? */
function findConfigFile(commandLine: ts.ParsedCommandLine) {
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
