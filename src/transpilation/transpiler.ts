import * as ts from "typescript";
import { Transpilation } from "./transpilation";
import { emitProgramModules, TranspileOptions } from "./transpile";
import { EmitHost } from "./utils";

export interface TranspilerOptions {
    emitHost?: EmitHost;
}

export interface EmitOptions extends TranspileOptions {
    writeFile?: ts.WriteFileCallback;
}

export interface EmitResult {
    emitSkipped: boolean;
    diagnostics: readonly ts.Diagnostic[];
}

export class Transpiler {
    public emitHost: EmitHost;
    constructor({ emitHost = ts.sys }: TranspilerOptions = {}) {
        this.emitHost = emitHost;
    }

    public emit(emitOptions: EmitOptions): EmitResult {
        const { program, writeFile = this.emitHost.writeFile } = emitOptions;
        const transpilation = new Transpilation(this, program);
        const { diagnostics, modules } = emitProgramModules(this.emitHost, writeFile, emitOptions);
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
