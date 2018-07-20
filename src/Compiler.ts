#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import { CompilerOptions, parseCommandLine } from "./CommandLineParser";
import { LuaTranspiler51 } from "./targets/Transpiler.51";
import { LuaTranspiler52 } from "./targets/Transpiler.52";
import { LuaTranspiler53 } from "./targets/Transpiler.53";
import { LuaTranspilerJIT } from "./targets/Transpiler.JIT";
import { LuaTarget, LuaTranspiler, TranspileError } from "./Transpiler";

export function compile(argv: string[]) {
    const commandLine = parseCommandLine(argv);
    compileFilesWithOptions(commandLine.fileNames, commandLine.options);
}

export function compileFilesWithOptions(fileNames: string[], options: CompilerOptions): void {
    if (!options.luaTarget) {
        options.luaTarget = LuaTarget.LuaJIT;
    }

    const program = ts.createProgram(fileNames, options);

    const checker = program.getTypeChecker();

    // Get all diagnostics, ignore unsupported extension
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diag => diag.code !== 6054);
    diagnostics.forEach(diagnostic => {
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
    if (diagnostics.filter(diag => diag.category === ts.DiagnosticCategory.Error).length > 0) {
        console.log("Stopping compilation process because of errors.");
        process.exit(1);
    }

    program.getSourceFiles().forEach(sourceFile => {
        if (!sourceFile.isDeclarationFile) {
            try {
                const rootDir = options.rootDir;

                console.log(`Transpiling ${sourceFile.fileName}...`);

                // Transpile AST
                const lua = createTranspiler(checker, options, sourceFile).transpileSourceFile();

                let outPath = sourceFile.fileName;
                if (options.outDir !== options.rootDir) {
                    const relativeSourcePath = path.resolve(sourceFile.fileName)
                                                   .replace(path.resolve(rootDir), "");
                    outPath = path.join(options.outDir, relativeSourcePath);
                }

                // change extension or rename to outFile
                if (options.outFile) {
                    if (path.isAbsolute(options.outFile)) {
                        outPath = options.outFile;
                    } else {
                        // append to workingDir or outDir
                        outPath = path.resolve(options.outDir, options.outFile);
                    }
                } else {
                    const fileNameLua = path.basename(outPath, path.extname(outPath)) + ".lua";
                    outPath = path.join(path.dirname(outPath), fileNameLua);
                }

                // Write output
                ts.sys.writeFile(outPath, lua);
            } catch (exception) {
                /* istanbul ignore else: Testing else part would require to add a bug/exception to our code */
                if (exception.node) {
                    const pos = ts.getLineAndCharacterOfPosition(sourceFile, exception.node.pos);
                    // Graciously handle transpilation errors
                    console.error("Encountered error parsing file: " + exception.message);
                    console.error(
                        sourceFile.fileName + " line: " + (1 + pos.line) + " column: " + pos.character + "\n" +
                        exception.stack
                    );
                    process.exit(1);
                } else {
                    throw exception;
                }
            }
        }
    });

    // Copy lualib to target dir
    if (!options.dontRequireLuaLib) {
        fs.copyFileSync(
            path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"),
            path.join(options.outDir, "lualib_bundle.lua")
        );
    }
}

export function createTranspiler(checker: ts.TypeChecker,
                                 options: ts.CompilerOptions,
                                 sourceFile: ts.SourceFile): LuaTranspiler {
    let luaTargetTranspiler: LuaTranspiler;
    switch (options.luaTarget) {
        case LuaTarget.LuaJIT:
            luaTargetTranspiler = new LuaTranspilerJIT(checker, options, sourceFile);
            break;
        case LuaTarget.Lua51:
            luaTargetTranspiler = new LuaTranspiler51(checker, options, sourceFile);
            break;
        case LuaTarget.Lua52:
            luaTargetTranspiler = new LuaTranspiler52(checker, options, sourceFile);
            break;
        case LuaTarget.Lua53:
            luaTargetTranspiler = new LuaTranspiler53(checker, options, sourceFile);
            break;
        default:
            // should not happen
            throw Error("No luaTarget Specified please ensure a target is set!");
    }

    return luaTargetTranspiler;
}
