import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions } from "../../CompilerOptions";
import { intersection, union } from "../../utils";

const libCache = new Map<string, ts.SourceFile>();
export function createVirtualProgram(input: Record<string, string>, options: CompilerOptions = {}): ts.Program {
    function notImplemented(): never {
        throw new Error("Not implemented");
    }

    const getFileFromInput = (fileName: string) =>
        input[fileName] ?? (fileName.startsWith("/") ? input[fileName.slice(1)] : undefined);

    const compilerHost: ts.CompilerHost = {
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "/",
        fileExists: fileName => fileName.startsWith("lib.") || getFileFromInput(fileName) !== undefined,
        readFile: notImplemented,
        writeFile: notImplemented,
        getDefaultLibFileName: ts.getDefaultLibFileName,
        getNewLine: () => "\n",

        getSourceFile(fileName) {
            const fileFromInput = getFileFromInput(fileName);
            if (fileFromInput !== undefined) {
                return ts.createSourceFile(fileName, fileFromInput, ts.ScriptTarget.Latest, false);
            }

            if (libCache.has(fileName)) return libCache.get(fileName)!;

            if (fileName.startsWith("lib.")) {
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                const filePath = path.join(typeScriptDir, fileName);
                const content = fs.readFileSync(filePath, "utf8");

                const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, false);
                libCache.set(fileName, sourceFile);
                return sourceFile;
            }
        },
    };

    return ts.createProgram(Object.keys(input), options, compilerHost);
}

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
