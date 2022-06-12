import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { parseConfigFileWithSystem } from "../cli/tsconfig";
import { CompilerOptions } from "../CompilerOptions";
import { normalizeSlashes } from "../utils";
import { createEmitOutputCollector, TranspiledFile } from "./output-collector";
import { EmitResult, Transpiler } from "./transpiler";

export { Plugin } from "./plugins";
export * from "./transpile";
export * from "./transpiler";
export { EmitHost } from "./utils";
export { TranspiledFile };

export function transpileFiles(
    rootNames: string[],
    options: CompilerOptions = {},
    writeFile?: ts.WriteFileCallback
): EmitResult {
    const program = ts.createProgram(rootNames, options);
    const { diagnostics: transpileDiagnostics, emitSkipped } = new Transpiler().emit({ program, writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);

    return { diagnostics: [...diagnostics], emitSkipped };
}

export function transpileProject(
    configFileName: string,
    optionsToExtend?: CompilerOptions,
    writeFile?: ts.WriteFileCallback
): EmitResult {
    const parseResult = parseConfigFileWithSystem(configFileName, optionsToExtend);
    if (parseResult.errors.length > 0) {
        return { diagnostics: parseResult.errors, emitSkipped: true };
    }

    return transpileFiles(parseResult.fileNames, parseResult.options, writeFile);
}

const libCache: { [key: string]: ts.SourceFile } = {};

/** @internal */
export function createVirtualProgram(input: Record<string, string>, options: CompilerOptions = {}): ts.Program {
    const normalizedFiles: Record<string, string> = {};
    for (const [path, file] of Object.entries(input)) {
        normalizedFiles[normalizeSlashes(path)] = file;
    }
    const compilerHost: ts.CompilerHost = {
        fileExists: fileName => fileName in normalizedFiles || ts.sys.fileExists(fileName),
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: ts.getDefaultLibFileName,
        readFile: () => "",
        getNewLine: () => "\n",
        useCaseSensitiveFileNames: () => false,
        writeFile() {},

        getSourceFile(fileName) {
            if (fileName in normalizedFiles) {
                return ts.createSourceFile(fileName, normalizedFiles[fileName], ts.ScriptTarget.Latest, false);
            }

            let filePath: string | undefined;

            if (fileName.startsWith("lib.")) {
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                filePath = path.join(typeScriptDir, fileName);
            }

            if (fileName.includes("language-extensions")) {
                const dtsName = fileName.replace(/(\.d)?(\.ts)$/, ".d.ts");
                filePath = path.resolve(dtsName);
            }

            if (filePath !== undefined) {
                if (libCache[fileName]) return libCache[fileName];
                const content = fs.readFileSync(filePath, "utf8");
                libCache[fileName] = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, false);
                return libCache[fileName];
            }
        },
    };

    return ts.createProgram(Object.keys(normalizedFiles), options, compilerHost);
}

export interface TranspileVirtualProjectResult {
    diagnostics: ts.Diagnostic[];
    transpiledFiles: TranspiledFile[];
}

export function transpileVirtualProject(
    files: Record<string, string>,
    options: CompilerOptions = {}
): TranspileVirtualProjectResult {
    const program = createVirtualProgram(files, options);
    const collector = createEmitOutputCollector();
    const { diagnostics: transpileDiagnostics } = new Transpiler().emit({ program, writeFile: collector.writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);

    return { diagnostics: [...diagnostics], transpiledFiles: collector.files };
}

export interface TranspileStringResult {
    diagnostics: ts.Diagnostic[];
    file?: TranspiledFile;
}

export function transpileString(main: string, options: CompilerOptions = {}): TranspileStringResult {
    const { diagnostics, transpiledFiles } = transpileVirtualProject({ "main.ts": main }, options);
    return {
        diagnostics,
        file: transpiledFiles.find(({ sourceFiles }) => sourceFiles.some(f => f.fileName === "main.ts")),
    };
}
