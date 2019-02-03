import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import {parseCommandLine, getHelpString} from "./CommandLineParser";
import {CompilerOptions, LuaLibImportKind, LuaTarget} from "./CompilerOptions";
import {LuaTranspiler} from "./LuaTranspiler";

export function compile(argv: string[]): void {
    const commandLine = parseCommandLine(argv);
    /* istanbul ignore if: tested in test/compiler/watchmode.spec with subproccess */
    if (commandLine.options.help) {
        console.log(getHelpString());
    }
    else if (commandLine.options.watch) {
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
        host = ts.createWatchCompilerHost(options.project, options, ts.sys, ts.createSemanticDiagnosticsBuilderProgram);
    } else {
        host = ts.createWatchCompilerHost(fileNames, options, ts.sys, ts.createSemanticDiagnosticsBuilderProgram);
    }

    host.afterProgramCreate = program => {
        const transpiler = new LuaTranspiler(program.getProgram());

        const status = transpiler.emitFilesAndReportErrors();
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

const libSource = fs.readFileSync(path.join(path.dirname(require.resolve("typescript")), "lib.es6.d.ts")).toString();

const defaultCompilerOptions: CompilerOptions = {
    luaLibImport: LuaLibImportKind.Require,
    luaTarget: LuaTarget.Lua53,
};

export function transpileString(
    str: string,
    options: CompilerOptions = defaultCompilerOptions,
    ignoreDiagnostics = false
): string {
    const compilerHost = {
        directoryExists: () => true,
        fileExists: (fileName): boolean => true,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: () => "lib.es6.d.ts",
        getDirectories: () => [],
        getNewLine: () => "\n",

        getSourceFile: (filename, languageVersion) => {
            if (filename === "file.ts") {
                return ts.createSourceFile(filename, str, ts.ScriptTarget.Latest, false);
            }
            if (filename === "lib.es6.d.ts") {
                return ts.createSourceFile(filename, libSource, ts.ScriptTarget.Latest, false);
            }
            return undefined;
        },

        readFile: () => "",

        useCaseSensitiveFileNames: () => false,
        // Don't write output
        writeFile: (name, text, writeByteOrderMark) => undefined,
    };
    const program = ts.createProgram(["file.ts"], options, compilerHost);

    if (!ignoreDiagnostics) {
        const diagnostics = ts.getPreEmitDiagnostics(program);
        const typeScriptErrors = diagnostics.filter(diag => diag.category === ts.DiagnosticCategory.Error);

        if (typeScriptErrors.length > 0) {
            typeScriptErrors.forEach(e => console.warn(e.messageText));
            throw new Error("Encountered invalid TypeScript.");
        }
    }

    const transpiler = new LuaTranspiler(program);

    const result = transpiler.transpileSourceFile(program.getSourceFile("file.ts"));

    return result.trim();
}