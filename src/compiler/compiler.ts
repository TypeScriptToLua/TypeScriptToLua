import { FileSystem } from "enhanced-resolve";
import * as ts from "typescript";
import { Compilation } from "./compilation";
import { Module } from "./module";
import { Plugin } from "./plugins";
import { emitProgramModules, TranspileOptions } from "./transpile";

export interface CompilerHost extends Pick<ts.System, "getCurrentDirectory" | "readFile" | "writeFile"> {
    resolutionFileSystem?: FileSystem;
}

export interface EmitOptions extends TranspileOptions {
    writeFile?: ts.WriteFileCallback;
    plugins?: Plugin[];
}

export interface EmitResult {
    emitSkipped: boolean;
    diagnostics: readonly ts.Diagnostic[];
}

export class Compiler {
    public host: CompilerHost;
    constructor({ host = ts.sys }: { host?: CompilerHost } = {}) {
        this.host = host;
    }

    public emit(emitOptions: EmitOptions): EmitResult {
        const { program, writeFile = this.host.writeFile } = emitOptions;
        const compilation = new Compilation(this, program, emitOptions.plugins ?? []);
        const { options } = compilation;

        // Clean-up module cache from modules created from deleted source files, so they won't be hit during resolution
        const programSourceFiles = program.getSourceFiles();
        const validModulesInCache = [...this.moduleCache.values()].filter(
            module => !module.sourceFiles?.some(sourceFile => !programSourceFiles.includes(sourceFile))
        );
        this.moduleCache.clear();
        validModulesInCache.forEach(m => this.addModuleToCache(m));

        emitProgramModules(compilation, writeFile, emitOptions);
        if (options.noEmit || (options.noEmitOnError && compilation.diagnostics.length > 0)) {
            return { diagnostics: compilation.diagnostics, emitSkipped: true };
        }

        compilation.emit(writeFile);

        return { diagnostics: compilation.diagnostics, emitSkipped: false };
    }

    // A module cache that persists between compilations, so it can generate ids for these modules,
    // without re-reading files every time
    private moduleCache = new Map<string, Module>();

    public addModuleToCache(module: Module) {
        this.moduleCache.set(module.fileName, module);
    }

    public findModuleInCache(fileName: string) {
        return this.moduleCache.get(fileName);
    }
}
