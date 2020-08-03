import * as ts from "typescript";
import { intersection, union } from "../utils";

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
