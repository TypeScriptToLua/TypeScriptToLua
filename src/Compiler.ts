#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import { CompilerOptions, parseCommandLine } from "./CommandLineParser";
import { LuaTranspiler, TranspileError } from "./Transpiler";
import { TSHelper as tsEx } from "./TSHelper";

function compile(fileNames: string[], options: CompilerOptions): void {
    const program = ts.createProgram(fileNames, options);
    const checker = program.getTypeChecker();

    // Get all diagnostics, ignore unsupported extension
    const diagnostics = ts.getPreEmitDiagnostics(program).filter((diag) => diag.code !== 6054);
    diagnostics.forEach((diagnostic) => {
        if (diagnostic.file) {
            const { line, character } =
                diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(
                `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
            );
        } else {
            console.log(
                `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
            );
        }
    });

    // If there are errors dont emit
    if (diagnostics.filter((diag) => diag.category === ts.DiagnosticCategory.Error).length > 0) {
        console.log("Stopping compilation process because of errors.");
        process.exit(1);
    }

    program.getSourceFiles().forEach((sourceFile) => {
        if (!sourceFile.isDeclarationFile) {
            try {
                const rootDir = options.rootDir;

                // Transpile AST
                const lua = LuaTranspiler.transpileSourceFile(sourceFile, checker, options);

                let outPath = sourceFile.fileName;
                if (options.outDir !== options.rootDir) {
                    const relativeSourcePath = path.resolve(sourceFile.fileName)
                                                   .replace(path.resolve(rootDir), "");
                    outPath = path.join(options.outDir, relativeSourcePath);
                }

                // change extension
                const fileNameLua = path.basename(outPath, path.extname(outPath)) + ".lua";
                outPath = path.join(path.dirname(outPath), fileNameLua);

                // Write output
                ts.sys.writeFile(outPath, lua);
            } catch (exception) {
                if (exception.node) {
                    const pos = ts.getLineAndCharacterOfPosition(sourceFile, exception.node.pos);
                    // Graciously handle transpilation errors
                    throw new Error(
                        "Encountered error parsing file: " + exception.message + "\n" +
                        sourceFile.fileName +
                        " line: " + (1 + pos.line) + " column: " + pos.character + "\n" +
                        exception.stack);
                } else {
                    throw exception;
                }
            }
        }
    });

    // Copy lualib to target dir
    fs.copyFileSync(
        path.resolve(__dirname, "../dist/lualib/typescript.lua"),
        path.join(options.outDir, "typescript_lualib.lua")
    );
}

export function execCommandLine(argv?: string[]) {
    argv = argv ? argv : process.argv.slice(2);
    const commandLine = parseCommandLine(argv);
    compile(commandLine.fileNames, commandLine.options);
}

execCommandLine();
