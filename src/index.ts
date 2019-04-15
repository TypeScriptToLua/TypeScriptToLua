import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { parseConfigFileWithSystem } from "./CommandLineParser";
import { CompilerOptions } from "./CompilerOptions";
import { getTranspileOutput, TranspilationResult, TranspiledFile } from "./Transpile";

export { parseCommandLine, ParsedCommandLine, updateParsedConfigFile } from "./CommandLineParser";
export { CompilerOptions, LuaLibImportKind, LuaTarget } from "./CompilerOptions";
export * from "./Emit";
export * from "./LuaAST";
export { LuaLibFeature } from "./LuaLib";
export { LuaPrinter } from "./LuaPrinter";
export { LuaTransformer } from "./LuaTransformer";
export * from "./Transpile";

export function transpileFiles(
    rootNames: string[],
    options: CompilerOptions = {}
): TranspilationResult {
    const program = ts.createProgram(rootNames, options);
    const { diagnostics, transpiledFiles } = getTranspileOutput({ program, options });

    const allDiagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...diagnostics,
    ]);

    return { transpiledFiles, diagnostics: [...allDiagnostics] };
}

export function transpileProject(fileName: string, options?: CompilerOptions): TranspilationResult {
    const parseResult = parseConfigFileWithSystem(fileName, options);
    if (parseResult.errors.length > 0) {
        return { diagnostics: parseResult.errors, transpiledFiles: new Map() };
    }

    return transpileFiles(parseResult.fileNames, parseResult.options);
}

const libCache: { [key: string]: ts.SourceFile } = {};

/** @internal */
export function createVirtualProgram(
    input: Record<string, string>,
    options: CompilerOptions = {}
): ts.Program {
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
                return ts.createSourceFile(
                    filename,
                    input[filename],
                    ts.ScriptTarget.Latest,
                    false
                );
            }

            if (filename.startsWith("lib.")) {
                if (libCache[filename]) return libCache[filename];
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                const filePath = path.join(typeScriptDir, filename);
                const content = fs.readFileSync(filePath, "utf8");

                libCache[filename] = ts.createSourceFile(
                    filename,
                    content,
                    ts.ScriptTarget.Latest,
                    false
                );

                return libCache[filename];
            }
        },
    };

    return ts.createProgram(Object.keys(input), options, compilerHost);
}

export interface TranspileStringResult {
    diagnostics: ts.Diagnostic[];
    file?: TranspiledFile;
}

export function transpileString(
    main: string,
    options: CompilerOptions = {}
): TranspileStringResult {
    const { diagnostics, transpiledFiles } = transpileVirtualProgram({ "main.ts": main }, options);
    return { diagnostics, file: transpiledFiles.get("main.ts") };
}

export function transpileVirtualProgram(
    files: Record<string, string>,
    options: CompilerOptions = {}
): TranspilationResult {
    const program = createVirtualProgram(files, options);
    const transpileOutput = getTranspileOutput({ program, options });
    const allDiagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileOutput.diagnostics,
    ]);

    return { ...transpileOutput, diagnostics: [...allDiagnostics] };
}
