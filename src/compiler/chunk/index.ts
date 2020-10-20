import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { normalizeSlashes } from "../../utils";
import { Compilation } from "../compilation";
import { Module } from "../module";

export * from "./assets";
export * from "./bundle";

export interface Chunk {
    outputPath: string;
    source: SourceNode;
    sourceFiles?: ts.SourceFile[];
}

export function modulesToChunks(compilation: Compilation, modules: Module[]): Chunk[] {
    return modules.map(module => {
        const moduleId = compilation.getModuleId(module);
        const outputPath = normalizeSlashes(path.resolve(compilation.outDir, `${moduleId.replace(/\./g, "/")}.lua`));
        return { outputPath, source: module.source, sourceFiles: module.sourceFiles };
    });
}
