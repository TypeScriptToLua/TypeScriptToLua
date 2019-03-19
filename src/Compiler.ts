import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import * as CommandLineParser from "./CommandLineParser";
import {CompilerOptions, LuaLibImportKind, LuaTarget} from "./CompilerOptions";
import {LuaTranspiler} from "./LuaTranspiler";

export function compile(argv: string[]): void {
    const parseResult = CommandLineParser.parseCommandLine(argv);

    if (parseResult.isValid === true) {

        if (parseResult.result.options.help) {
            console.log(CommandLineParser.getHelpString());
            return;
        }

        if (parseResult.result.options.version) {
            console.log(CommandLineParser.version);
            return;
        }

        /* istanbul ignore if: tested in test/compiler/watchmode.spec with subproccess */
        if (parseResult.result.options.watch) {
            watchWithOptions(parseResult.result.fileNames, parseResult.result.options);
        } else {
            compileFilesWithOptions(parseResult.result.fileNames, parseResult.result.options);
        }
    } else {
        console.error(`Invalid CLI input: ${parseResult.errorMessage}`);
    }
}

/* istanbul ignore next: tested in test/compiler/watchmode.spec with subproccess */
export function watchWithOptions(fileNames: string[], options: CompilerOptions): void {
    let host: ts.WatchCompilerHost<ts.SemanticDiagnosticsBuilderProgram>;
    let config = false;
    if (options.project) {
        config = true;
        host = ts.createWatchCompilerHost(options.project, options, ts.sys, ts.createSemanticDiagnosticsBuilderProgram);
    } else {
        host = ts.createWatchCompilerHost(fileNames, options, ts.sys, ts.createSemanticDiagnosticsBuilderProgram);
    }

    let fullRecompile = true;
    host.afterProgramCreate = program => {
        const transpiler = new LuaTranspiler(program.getProgram());

        let status = transpiler.reportErrors();

        if (status === 0) {
            if (fullRecompile) {
                status = transpiler.emitFilesAndReportErrors();
            } else {
                while (true) {
                    const currentFile = program.getSemanticDiagnosticsOfNextAffectedFile();
                    if (!currentFile) { break; }
                    const fileStatus = transpiler.emitSourceFile(currentFile.affected as ts.SourceFile);
                    status |= fileStatus;
                }
            }
            // do a full recompile after transpiler error.
            fullRecompile = status !== 0;
        }

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
        host.onWatchStatusChange(errorDiagnostic, host.getNewLine(), program.getCompilerOptions());
    };

    if (config) {
        ts.createWatchProgram(
            host as ts.WatchCompilerHostOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>
        );
    } else {
        ts.createWatchProgram(
            host as ts.WatchCompilerHostOfFilesAndCompilerOptions<ts.SemanticDiagnosticsBuilderProgram>
        );
    }
}

export function compileFilesWithOptions(fileNames: string[], options: CompilerOptions): void {
    const program = ts.createProgram(fileNames, options);

    const transpiler = new LuaTranspiler(program);

    transpiler.emitFilesAndReportErrors();
}

const libCache: {[key: string]: string} = {};

const defaultCompilerOptions: CompilerOptions = {
    luaLibImport: LuaLibImportKind.Require,
    luaTarget: LuaTarget.Lua53,
};

export function createStringCompilerProgram(
    input: string | { [filename: string]: string },
    options: CompilerOptions = defaultCompilerOptions,
    filePath = "file.ts"
): ts.Program {
    const compilerHost =  {
        directoryExists: () => true,
        fileExists: (fileName): boolean => true,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: () => "lib.es6.d.ts",
        getDirectories: () => [],
        getNewLine: () => "\n",

        getSourceFile: (filename: string) => {
            switch (typeof input) {
                case "string":
                    if (filename === filePath) {
                        return ts.createSourceFile(filename, input, ts.ScriptTarget.Latest, false);
                    }
                    break;
                case "object":
                    if (filename in input) {
                        return ts.createSourceFile(filename, input[filename], ts.ScriptTarget.Latest, false);
                    }
                    break;
            }
            if (filename.indexOf(".d.ts") !== -1) {
                if (!libCache[filename]) {
                    const typeScriptDir = path.dirname(require.resolve("typescript"));
                    const filePath = path.join(typeScriptDir, filename);
                    if (fs.existsSync(filePath)) {
                        libCache[filename] = fs.readFileSync(filePath).toString();
                    } else {
                        const pathWithLibPrefix = path.join(typeScriptDir, "lib." + filename);
                        libCache[filename] = fs.readFileSync(pathWithLibPrefix).toString();
                    }
                }
                return ts.createSourceFile(filename, libCache[filename], ts.ScriptTarget.Latest, false);
            }
            return undefined;
        },

        readFile: () => "",

        useCaseSensitiveFileNames: () => false,
        // Don't write output
        writeFile: (name, text, writeByteOrderMark) => undefined,
    };
    const filePaths = typeof input === "string" ? [filePath] : Object.keys(input);
    return ts.createProgram(filePaths, options, compilerHost);
}

export function transpileString(
    input: string | { [filename: string]: string },
    options: CompilerOptions = defaultCompilerOptions,
    ignoreDiagnostics = false,
    filePath = "file.ts"
): string {
    const program = createStringCompilerProgram(input, options, filePath);

    if (!ignoreDiagnostics) {
        const diagnostics = ts.getPreEmitDiagnostics(program);
        const typeScriptErrors = diagnostics.filter(diag => diag.category === ts.DiagnosticCategory.Error);

        if (typeScriptErrors.length > 0) {
            typeScriptErrors.forEach(e => console.warn(e.messageText));
            throw new Error("Encountered invalid TypeScript.");
        }
    }

    const transpiler = new LuaTranspiler(program);

    const result = transpiler.transpileSourceFile(program.getSourceFile(filePath));

    return result.trim();
}
