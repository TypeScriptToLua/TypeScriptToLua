#!/usr/bin/env node

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as yargs from 'yargs'

// ES6 syntax broken
import dedent = require("dedent")
import mkdirp = require("mkdirp")

import { LuaTranspiler, TranspileError } from "./Transpiler";
import { TSHelper as tsEx } from "./TSHelper";

interface CompilerOptions extends ts.CompilerOptions {
    addHeader?: boolean;
    luaTarget?: string
    luaLibDir?: string;
}

function compile(fileNames: string[], options: CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    let checker = program.getTypeChecker();

    // Get all diagnostics, ignore unsupported extension
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diag => diag.code != 6054);
    diagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        }
        else {
            console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
        }
    });

    // If there are errors dont emit
    if (diagnostics.filter(diag => diag.category == ts.DiagnosticCategory.Error).length > 0) {
        console.log("Stopping compilation process because of errors.");
        process.exit(1);
    }

    if (!options.rootDir) {
        options.rootDir = process.cwd();
    }

    if (!options.outDir) {
        options.outDir = options.rootDir;
    }

    options.luaLibDir = path.resolve(options.outDir, options.luaLibDir);
    mkdirp.sync(options.luaLibDir);

    // Copy lualib to target dir
    // This isnt run in sync because copyFileSync wont report errors.
    fs.copyFile(path.resolve(__dirname, "../dist/lualib/typescript.lua"), path.join(options.luaLibDir, "typescript_lualib.lua"), (err: NodeJS.ErrnoException) => {
        if (err) {
            console.log("ERROR: copying lualib to output.");
        }
    });

    program.getSourceFiles().forEach(sourceFile => {
        if (!sourceFile.isDeclarationFile) {
            try {
                let rootDir = options.rootDir;

                // Transpile AST
                let lua = LuaTranspiler.transpileSourceFile(sourceFile, checker, options);

                let outPath = sourceFile.fileName;
                if (options.outDir !== options.rootDir) {
                    outPath = path.join(options.outDir, path.resolve(sourceFile.fileName).replace(rootDir, ""));
                }

                // change extension
                const fileNameLua = path.basename(outPath, path.extname(outPath)) + '.lua';
                outPath = path.join(path.dirname(outPath), fileNameLua);

                // Write output
                ts.sys.writeFile(outPath, lua);
            } catch (exception) {
                if (exception.node) {
                    const pos = ts.getLineAndCharacterOfPosition(sourceFile, exception.node.pos);
                    // Graciously handle transpilation errors
                    console.error("Encountered error parsing file: " + exception.message);
                    console.error(sourceFile.fileName + " line: " + (1 + pos.line) + " column: " + pos.character);
                    console.error(exception.stack);
                    process.exit(1);
                } else {
                    throw exception;
                }
            }
        }
    });

    process.exit(0);
}

function printAST(node: ts.Node, indent: number) {
    let indentStr = "";
    for (let i = 0; i < indent; i++) indentStr += "    ";

    console.log(indentStr + tsEx.enumName(node.kind, ts.SyntaxKind));
    node.forEachChild(child => printAST(child, indent + 1));
}

// Polyfill for report diagnostics
function logError(commandLine: ts.ParsedCommandLine, tstlOptionKeys: ReadonlyArray<string>) {
    const tsInvalidCompilerOptionErrorCode = 5023;
    let ignoredErrorCount = 0;

    if (commandLine.errors.length !== 0) {
        commandLine.errors.forEach((err) => {
            // Ignore errors caused by tstl specific compiler options
            if (err.code == tsInvalidCompilerOptionErrorCode) {
                for (const key of tstlOptionKeys) {
                    if (err.messageText.toString().indexOf(key) != -1) {
                        ignoredErrorCount += 1;
                    }
                }
            }
            else {
                console.log(err.messageText);
            }
        });
        if (commandLine.errors.length > ignoredErrorCount) {
            process.exit(1);
        }
    }
}

function executeCommandLine(args: ReadonlyArray<string>) {
    const tstlOptions: {[key: string]: yargs.Options} = {
        'lt': {
            alias: 'luaTarget',
            choices: ['JIT', '5.1', '5.2', '5.3'],
            default: 'JIT',
            describe: 'Specify Lua target version.',
            type: 'string'
        },
        'lld': {
            alias: 'luaLibDir',
            describe: 'Specify typescript_lualib.lua location relative to outDir.',
            default: './',
            type: 'string'
        },
        'ah': {
            alias: 'addHeader',
            describe: 'Specify if a header will be added to compiled files.',
            default: true,
            type: 'boolean'
        }
    };

    const tstlOptionKeys = [];
    for (let key in tstlOptions) {
        let optionName = key;
        if (tstlOptions[key].alias) {
            optionName = tstlOptions[key].alias as string;
        }

        tstlOptionKeys.push(optionName);
    }

    const argv = yargs
        .usage(dedent(`tstl [options] [files...]
        
            In addition to the options listed below you can also pass options for the typescript compiler (For a list of options use tsc -h).
            
            NOTES:
            - The tsc options might have no effect.
            - Options in tsconfig.json are prioritized.`))
        .example('tstl path/to/file.ts [...]', 'Compile files')
        .example('tstl -p path/to/tsconfig.json', 'Compile project')
        .options(tstlOptions)
        .argv;

    let commandLine = ts.parseCommandLine(args);

    logError(commandLine, tstlOptionKeys);

    // Add tstl CLI options
    for (const key of tstlOptionKeys) {
        commandLine.options[key] = argv[key];
    }

    let configPath;
    if (commandLine.options.project) {
        configPath = path.isAbsolute(commandLine.options.project) ? commandLine.options.project : path.join(process.cwd(), commandLine.options.project);
        if (fs.statSync(configPath).isDirectory()) {
            configPath = path.join(configPath, 'tsconfig.json');
        } else if (fs.statSync(configPath).isFile() && path.extname(configPath) === ".ts") {
            // Search for tsconfig upwards in directory hierarchy starting from the file path
            let dir = path.dirname(configPath).split(path.sep);
            let found = false;
            for (let i = dir.length; i > 0; i--) {
                const searchPath = dir.slice(0, i).join("/") + path.sep + "tsconfig.json";

                // If tsconfig.json was found, stop searching
                if (ts.sys.fileExists(searchPath)) {
                    configPath = searchPath;
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.error("Tried to build project but could not find tsconfig.json!");
                process.exit(1);
            }
        }
        commandLine.options.project = configPath;
        let configContents = fs.readFileSync(configPath).toString();
        const configJson = ts.parseConfigFileTextToJson(configPath, configContents);
        commandLine = ts.parseJsonConfigFileContent(configJson.config, ts.sys, path.dirname(configPath), commandLine.options);

        // Add compiler options that are ignored by TS parsers
        // Options supplied in tsconfig are prioritized to allow for CLI defaults
        for (const compilerOption in commandLine.raw.compilerOptions) {
            if (tstlOptionKeys.indexOf(compilerOption) != -1) {
                commandLine.options[compilerOption] = commandLine.raw.compilerOptions[compilerOption];
            }
        }
    }

    if (configPath && !commandLine.options.rootDir) {
        commandLine.options.rootDir = path.dirname(configPath);
    }

    logError(commandLine, tstlOptionKeys);

    compile(commandLine.fileNames, commandLine.options);
}

executeCommandLine(process.argv.slice(2));
