import { FileSystem } from "enhanced-resolve";
import * as ts from "typescript";
import { printChunk } from "./chunk";
import { Plugin } from "./plugins";
import { Transpilation } from "./transpilation";
import { emitProgramModules, TranspileOptions } from "./transpile";

export interface TranspilerHost extends Pick<ts.System, "getCurrentDirectory" | "readFile" | "writeFile"> {
    resolutionFileSystem?: FileSystem;
}

export interface TranspilerOptions {
    host?: TranspilerHost;
}

export interface EmitOptions extends TranspileOptions {
    writeFile?: ts.WriteFileCallback;
    plugins?: Plugin[];
}

export interface EmitResult {
    emitSkipped: boolean;
    diagnostics: readonly ts.Diagnostic[];
}

export class Transpiler {
    public host: TranspilerHost;
    constructor({ host = ts.sys }: TranspilerOptions = {}) {
        this.host = host;
    }

    public emit(emitOptions: EmitOptions): EmitResult {
        const { program, writeFile = this.host.writeFile } = emitOptions;
        const transpilation = new Transpilation(this, program, emitOptions.plugins ?? []);
        const { options } = transpilation;

        emitProgramModules(transpilation, writeFile, emitOptions);
        if (options.noEmit || (options.noEmitOnError && transpilation.diagnostics.length > 0)) {
            return { diagnostics: transpilation.diagnostics, emitSkipped: true };
        }

        const chunks = transpilation.emit();

        const emitBOM = options.emitBOM ?? false;
        for (const chunk of chunks) {
            const { code, sourceMap } = printChunk(chunk, options);
            writeFile(chunk.outputPath, code, emitBOM, undefined, chunk.sourceFiles);
            if (sourceMap !== undefined) {
                writeFile(chunk.outputPath + ".map", sourceMap, emitBOM, undefined, chunk.sourceFiles);
            }
        }

        return { diagnostics: transpilation.diagnostics, emitSkipped: chunks.length === 0 };
    }
}
