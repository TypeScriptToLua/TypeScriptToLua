import * as path from "path";
import * as ts from "typescript";
import { isBundleEnabled } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { normalizeSlashes, trimExtension } from "../utils";
import { getBundleResult } from "./bundle";
import { getProgramTranspileResult, TranspileOptions } from "./transpile";
import { EmitFile, EmitHost, ProcessedFile } from "./utils";

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
    protected emitHost: EmitHost;
    constructor({ emitHost = ts.sys }: TranspilerOptions = {}) {
        this.emitHost = emitHost;
    }

    public emit(emitOptions: EmitOptions): EmitResult {
        const { program, writeFile = this.emitHost.writeFile } = emitOptions;
        const { diagnostics, transpiledFiles: freshFiles } = getProgramTranspileResult(
            this.emitHost,
            writeFile,
            emitOptions
        );
        const { emitPlan } = this.getEmitPlan(program, diagnostics, freshFiles);

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

    protected getEmitPlan(
        program: ts.Program,
        diagnostics: ts.Diagnostic[],
        files: ProcessedFile[]
    ): { emitPlan: EmitFile[] } {
        const options = program.getCompilerOptions();
        const rootDir = program.getCommonSourceDirectory();
        const outDir = options.outDir ?? rootDir;

        const lualibRequired = files.some(f => f.code.includes('require("lualib_bundle")'));
        if (lualibRequired) {
            const fileName = normalizeSlashes(path.resolve(rootDir, "lualib_bundle.lua"));
            files.unshift({ fileName, code: getLuaLibBundle(this.emitHost) });
        }

        let emitPlan: EmitFile[];
        if (isBundleEnabled(options)) {
            const [bundleDiagnostics, bundleFile] = getBundleResult(program, this.emitHost, files);
            diagnostics.push(...bundleDiagnostics);
            emitPlan = [bundleFile];
        } else {
            emitPlan = files.map(file => {
                const pathInOutDir = path.resolve(outDir, path.relative(rootDir, file.fileName));
                const outputPath = normalizeSlashes(trimExtension(pathInOutDir) + ".lua");
                return { ...file, outputPath };
            });
        }

        return { emitPlan };
    }
}
