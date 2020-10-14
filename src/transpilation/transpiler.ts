import { FileSystem } from "enhanced-resolve";
import * as ts from "typescript";
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
        const transpilation = new Transpilation(this, program);
        const { diagnostics, modules } = emitProgramModules(this.host, writeFile, emitOptions);
        const emitPlan = transpilation.emit(modules);
        diagnostics.push(...transpilation.diagnostics);

        const options = program.getCompilerOptions();
        const emitBOM = options.emitBOM ?? false;
        for (const { outputPath, code, sourceMap, sourceFiles } of emitPlan) {
            writeFile(outputPath, code, emitBOM, undefined, sourceFiles);
            if (options.sourceMap && sourceMap !== undefined) {
                writeFile(outputPath + ".map", sourceMap, emitBOM, undefined, sourceFiles);
            }
        }

        return { diagnostics, emitSkipped: emitPlan.length === 0 };
    }
}
