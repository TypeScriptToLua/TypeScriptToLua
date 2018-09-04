import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import { CompilerOptions, parseCommandLine } from "./CommandLineParser";
import { LuaTranspiler51 } from "./targets/Transpiler.51";
import { LuaTranspiler52 } from "./targets/Transpiler.52";
import { LuaTranspiler53 } from "./targets/Transpiler.53";
import { LuaTranspilerJIT } from "./targets/Transpiler.JIT";
import { LuaLibImportKind, LuaTarget, LuaTranspiler } from "./Transpiler";

export function compile(argv: string[]): void {
    const commandLine = parseCommandLine(argv);
    /* istanbul ignore if: tested in test/compiler/watchmode.spec with subproccess */
    if (commandLine.options.watch) {
        watchWithOptions(commandLine.fileNames, commandLine.options);
    } else {
        compileFilesWithOptions(commandLine.fileNames, commandLine.options);
    }
}

/* istanbul ignore next: tested in test/compiler/watchmode.spec with subproccess */
export function watchWithOptions(fileNames: string[], options: CompilerOptions): void {
    let host: ts.WatchCompilerHost<ts.SemanticDiagnosticsBuilderProgram>;
    let config = false;
    if (options.project) {
        config = true;
        host = ts.createWatchCompilerHost(
            options.project,
            options,
            ts.sys,
            ts.createSemanticDiagnosticsBuilderProgram
        );
    } else {
        host = ts.createWatchCompilerHost(
            fileNames,
            options,
            ts.sys,
            ts.createSemanticDiagnosticsBuilderProgram
        );
    }

    host.afterProgramCreate = program => {
        const status = emitFilesAndReportErrors(program.getProgram());
        const errorDiagnostic: ts.Diagnostic = {
            category: undefined,
            code: 6194,
            file: undefined,
            length: 0,
            messageText: "Found 0 errors. Watching for file changes.",
            start: 0,
        };
        if (status !== 0) {
            errorDiagnostic.messageText = "Found Errors. Watching for file changes.";
            errorDiagnostic.code = 6193;
        }
        host.onWatchStatusChange(
            errorDiagnostic,
            host.getNewLine(),
            program.getCompilerOptions()
        );
    };

    if (config) {
        ts.createWatchProgram(
            host as ts.WatchCompilerHostOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>);
    } else {
        ts.createWatchProgram(
            host as ts.WatchCompilerHostOfFilesAndCompilerOptions<ts.SemanticDiagnosticsBuilderProgram>);
    }
}

export function compileFilesWithOptions(fileNames: string[], options: CompilerOptions): void {
    const program = ts.createProgram(fileNames, options);

    emitFilesAndReportErrors(program);
}

function emitFilesAndReportErrors(program: ts.Program): number {
    const options = program.getCompilerOptions() as CompilerOptions;

    const checker = program.getTypeChecker();

    // Get all diagnostics, ignore unsupported extension
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diag => diag.code !== 6054);
    diagnostics.forEach(reportDiagnostic);

    // If there are errors dont emit
    if (diagnostics.filter(diag => diag.category === ts.DiagnosticCategory.Error).length > 0) {
        if (!options.watch) {
            process.exit(1);
        } else {
            return 1;
        }
    }

    program.getSourceFiles().forEach(sourceFile => {

        if (!sourceFile.isDeclarationFile) {
            try {
                const rootDir = options.rootDir;

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
    if (options.luaLibImport === LuaLibImportKind.Require || options.luaLibImport === LuaLibImportKind.Always) {
        fs.copyFileSync(
            path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"),
            path.join(options.outDir, "lualib_bundle.lua")
        );
    }

    return 0;
}

export function createTranspiler(checker: ts.TypeChecker,
                                 options: CompilerOptions,
                                 sourceFile: ts.SourceFile): LuaTranspiler {
    let luaTargetTranspiler: LuaTranspiler;
    const target = options.luaTarget ? options.luaTarget.toLowerCase() : "";
    switch (target) {
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
            luaTargetTranspiler = new LuaTranspilerJIT(checker, options, sourceFile);
            break;
    }

    return luaTargetTranspiler;
}

function reportDiagnostic(diagnostic: ts.Diagnostic): void {
    if (diagnostic.file) {
        const { line, character } =
            diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.log(
            `${diagnostic.code}: ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
        );
    } else {
        console.log(
            `${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
        );
    }
}
