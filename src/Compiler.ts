#!/usr/bin/env node

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

// ES6 syntax broken
import minimist = require("minimist")
import dedent = require("dedent")

import { LuaTranspiler, TranspileError } from "./Transpiler";
import { TSHelper as tsEx } from "./TSHelper";

function compile(fileNames: string[], options: ts.CompilerOptions): void {
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

    program.getSourceFiles().forEach(sourceFile => {
        if (!sourceFile.isDeclarationFile) {
            try {
                let rootDir = options.rootDir;
                if (!rootDir) {
                    rootDir = process.cwd();
                }

                // Transpile AST
                let lua = LuaTranspiler.transpileSourceFile(sourceFile, checker, options);

                let outPath = sourceFile.fileName;
                if (options.outDir) {
                    outPath = path.join(options.outDir, sourceFile.fileName.replace(rootDir, ""));
                }

                // change extension
                var fileNameLua = path.basename(outPath, path.extname(outPath)) + '.lua';
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

// Removes the option and value form argv
function removeInvalidOptionsFromArgv(commandLine: ReadonlyArray<string>, invalidOptions: ReadonlyArray<string>): ReadonlyArray<string> {
    let result = commandLine.slice()
    for (let opt of invalidOptions) {
        let index = result.indexOf('--' + opt);
        if (index === -1) {
            index = result.indexOf('-' + opt)
        }
        if (index !== -1) {
            result.splice(index, 2);
        }
    }
    return result;
}

// Polyfill for report diagnostics
function logError(commandLine: ts.ParsedCommandLine) {
    if (commandLine.errors.length !== 0) {
        commandLine.errors.forEach((err) => {
            console.log(err.messageText);
        });
        process.exit(1);
    }
}

function executeCommandLine(args: ReadonlyArray<string>) {
    // Right now luaTarget, version and help are the only cli options, if more are added we should
    // add a more advanced custom parser
    var argv = minimist(args, {
        string: ['l'],
        alias: { h: 'help', v: 'version', l: 'luaTarget' },
        default: { luaTarget: 'JIT' },
        '--': true,
        stopEarly: true,
    });

    let tstlVersion
    try {
        tstlVersion = require('../package').version;
    } catch (e) {
        tstlVersion = "0.0.0";
    }

    var helpString = dedent(`Version: ${tstlVersion}
    Syntax:  tstl [options] [files...]

    In addtion to the options listed below you can also pass options for the
    typescript compiler (For a list of options use tsc -h). NOTE: The tsc options
    might have no effect.

    Options:
      --version        Show version number
      --luaTarget, -l  Specify Lua target version: 'JIT' (Default), '5.1', '5.2',
                       '5.3'
      --project, -p    Compile the project given the path to its configuration file,
                       or to a folder with a 'tsconfig.json'
      --help           Show this message
    `);
    if (argv.help) {
        console.log(helpString);
        process.exit(0);
    }
    if (argv.version) {
        console.log("Version: " + require('../package').version);
    }
    let validLuaTargets = ['JIT', '5.3', '5.2', '5.1'];
    if (!validLuaTargets.some(val => val === argv.luaTarget)) {
        console.error(`Invalid lua target valid targets are: ${validLuaTargets.toString()}`);
    }

    // Remove tstl options otherwise ts will emit an error
    let sanitizedArgs = removeInvalidOptionsFromArgv(args, ['l', 'luaTarget'])

    let commandLine = ts.parseCommandLine(sanitizedArgs);

    logError(commandLine);

    commandLine.options.luaTarget = argv.luaTarget;
    let configPath;
    if (commandLine.options.project) {
        configPath = path.isAbsolute(commandLine.options.project) ? commandLine.options.project : path.join(process.cwd(), commandLine.options.project);
        if (fs.statSync(configPath).isDirectory()) {
            configPath = path.join(configPath, 'tsconfig.json');
        }
        let configContents = fs.readFileSync(configPath).toString();
        const configJson = ts.parseConfigFileTextToJson(configPath, configContents);
        commandLine = ts.parseJsonConfigFileContent(configJson.config, ts.sys, path.dirname(configPath), commandLine.options);

        // Append lua target to options array since its ignored by TS parsers
        // option supplied on CLI is prioritized
        if (argv.luaTarget === "JIT" && commandLine.raw.luaTarget !== argv.luaTarget) {
            commandLine.options.luaTarget = commandLine.raw.luaTarget;
        }
    }

    if (configPath && !commandLine.options.rootDir) {
        commandLine.options.rootDir = path.dirname(configPath);
    }

    logError(commandLine);

    compile(commandLine.fileNames, commandLine.options);
}

executeCommandLine(process.argv.slice(2));
