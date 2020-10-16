import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { normalizeSlashes } from "../../utils";
import { Module } from "../module";
import { Transpilation } from "../transpilation";

export * from "./bundle";
export * from "./print";

export interface Chunk {
    outputPath: string;
    source: SourceNode;
    sourceFiles?: ts.SourceFile[];
}

export function modulesToChunks(transpilation: Transpilation, modules: Module[]): Chunk[] {
    return modules.map(module => {
        const moduleId = transpilation.getModuleId(module);
        const outputPath = normalizeSlashes(path.resolve(transpilation.outDir, `${moduleId.replace(/\./g, "/")}.lua`));
        return { outputPath, source: module.source, sourceFiles: module.sourceFiles };
    });
}
