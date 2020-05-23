import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { parseConfigFileWithSystem } from "../cli/tsconfig";
import { CompilerOptions } from "../CompilerOptions";
import { intersection, union } from "../utils";
import { EmitResult, Transpiler } from "./transpiler";

export { Plugin } from "./plugins";
export * from "./transpiler";
export { EmitHost } from "./utils";

export interface TranspiledFile {
    sourceFiles: ts.SourceFile[];
    lua?: string;
    luaSourceMap?: string;
    declaration?: string;
    declarationMap?: string;
    /** @internal */
    js?: string;
    /** @internal */
    jsSourceMap?: string;
}

/** @internal */
export function createEmitOutputCollector() {
    const files: TranspiledFile[] = [];
    const writeFile: ts.WriteFileCallback = (fileName, data, _bom, _onError, sourceFiles = []) => {
        let file = files.find(f => intersection(f.sourceFiles, sourceFiles).length > 0);
        if (!file) {
            file = { sourceFiles: [...sourceFiles] };
            files.push(file);
        } else {
            file.sourceFiles = union(file.sourceFiles, sourceFiles);
        }

        if (fileName.endsWith(".lua")) {
            file.lua = data;
        } else if (fileName.endsWith(".lua.map")) {
            file.luaSourceMap = data;
        } else if (fileName.endsWith(".js")) {
            file.js = data;
        } else if (fileName.endsWith(".js.map")) {
            file.jsSourceMap = data;
        } else if (fileName.endsWith(".d.ts")) {
            file.declaration = data;
        } else if (fileName.endsWith(".d.ts.map")) {
            file.declarationMap = data;
        }
    };

    return { writeFile, files };
}

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
    const compilerHost: ts.CompilerHost = {
        fileExists: () => true,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: ts.getDefaultLibFileName,
        readFile: () => "",
        getNewLine: () => "\n",
        useCaseSensitiveFileNames: () => false,
        writeFile() {},

        getSourceFile(fileName) {
            if (fileName in input) {
                return ts.createSourceFile(fileName, input[fileName], ts.ScriptTarget.Latest, false);
            }

            if (fileName.startsWith("lib.")) {
                if (libCache[fileName]) return libCache[fileName];
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                const filePath = path.join(typeScriptDir, fileName);
                const content = fs.readFileSync(filePath, "utf8");

                libCache[fileName] = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, false);

                return libCache[fileName];
            }
        },
    };

    return ts.createProgram(Object.keys(input), options, compilerHost);
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
