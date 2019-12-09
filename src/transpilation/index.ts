import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { parseConfigFileWithSystem } from "../cli/tsconfig";
import { CompilerOptions } from "../CompilerOptions";
import { emitTranspiledFiles, OutputFile } from "./emit";
import { transpile, TranspiledFile, TranspileResult } from "./transpile";

export * from "./emit";
export * from "./transpile";

export interface TranspileFilesResult {
    diagnostics: ts.Diagnostic[];
    emitResult: OutputFile[];
}

export function transpileFiles(rootNames: string[], options: CompilerOptions = {}): TranspileFilesResult {
    const program = ts.createProgram(rootNames, options);
    const { transpiledFiles, diagnostics: transpileDiagnostics } = transpile({ program });
    const emitResult = emitTranspiledFiles(program, transpiledFiles);

    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);

    return { diagnostics: [...diagnostics], emitResult };
}

export function transpileProject(configFileName: string, optionsToExtend?: CompilerOptions): TranspileFilesResult {
    const parseResult = parseConfigFileWithSystem(configFileName, optionsToExtend);
    if (parseResult.errors.length > 0) {
        return { diagnostics: parseResult.errors, emitResult: [] };
    }

    return transpileFiles(parseResult.fileNames, parseResult.options);
}

const libCache: { [key: string]: ts.SourceFile } = {};

/** @internal */
export function createVirtualProgram(input: Record<string, string>, options: CompilerOptions = {}): ts.Program {
    const compilerHost: ts.CompilerHost = {
        fileExists: () => true,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: ts.getDefaultLibFileName,
        readFile: () => "",
        getNewLine: () => "\n",
        useCaseSensitiveFileNames: () => false,
        writeFile: () => {},

        getSourceFile: filename => {
            if (filename in input) {
                return ts.createSourceFile(filename, input[filename], ts.ScriptTarget.Latest, false);
            }

            if (filename.startsWith("lib.")) {
                if (libCache[filename]) return libCache[filename];
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                const filePath = path.join(typeScriptDir, filename);
                const content = fs.readFileSync(filePath, "utf8");

                libCache[filename] = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, false);

                return libCache[filename];
            }
        },
    };

    return ts.createProgram(Object.keys(input), options, compilerHost);
}

export function transpileVirtualProject(files: Record<string, string>, options: CompilerOptions = {}): TranspileResult {
    const program = createVirtualProgram(files, options);
    const result = transpile({ program });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([...ts.getPreEmitDiagnostics(program), ...result.diagnostics]);

    return { ...result, diagnostics: [...diagnostics] };
}

export interface TranspileStringResult {
    diagnostics: ts.Diagnostic[];
    file?: TranspiledFile;
}

export function transpileString(main: string, options: CompilerOptions = {}): TranspileStringResult {
    const { diagnostics, transpiledFiles } = transpileVirtualProject({ "main.ts": main }, options);
    return { diagnostics, file: transpiledFiles.find(({ fileName }) => fileName === "main.ts") };
}
