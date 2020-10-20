import { FileSystem } from "enhanced-resolve";
import * as ts from "typescript";
import { Compilation } from "./compilation";
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

        emitProgramModules(compilation, writeFile, emitOptions);
        if (options.noEmit || (options.noEmitOnError && compilation.diagnostics.length > 0)) {
            return { diagnostics: compilation.diagnostics, emitSkipped: true };
        }

        compilation.emit(writeFile);

        return { diagnostics: compilation.diagnostics, emitSkipped: false };
    }
}
