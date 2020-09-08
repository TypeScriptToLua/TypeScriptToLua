import * as path from "path";
import * as ts from "typescript";
import { isBundleEnabled, isLualibBundleSeparate } from "../CompilerOptions";
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

        // there has to be a more elegant way to do this

        let emitPlan: EmitFile[];

        if (lualibRequired) {
            const fileName = normalizeSlashes(path.resolve(rootDir, "lualib_bundle.lua"));

            if (isBundleEnabled(options) && isLualibBundleSeparate(options)) {
                const lualib = { fileName, code: getLuaLibBundle(this.emitHost) };
                const lualibPathInOutDir = path.resolve(outDir, path.relative(rootDir, lualib.fileName));
                const lualibOutputPath = normalizeSlashes(trimExtension(lualibPathInOutDir) + ".lua");

                const lualibEmitFile: EmitFile = {
                    outputPath: lualibOutputPath,
                    code: lualib.code,
                };

                const bundledProgram = this.getEmitFileBundled(program, diagnostics, files);

                emitPlan = [lualibEmitFile, bundledProgram];
            } else if (isBundleEnabled(options)) {
                files.unshift({ fileName, code: getLuaLibBundle(this.emitHost) });
                const bundledProgram = this.getEmitFileBundled(program, diagnostics, files);
                emitPlan = [bundledProgram];
            } else {
                files.unshift({ fileName, code: getLuaLibBundle(this.emitHost) });
                emitPlan = this.getEmitFilesNoBundle(files, outDir, rootDir);
            }
        } else if (isBundleEnabled(options)) {
            emitPlan = [this.getEmitFileBundled(program, diagnostics, files)];
        } else {
            emitPlan = this.getEmitFilesNoBundle(files, outDir, rootDir);
        }

        // // lua lib required, bundle & separate
        // // lua lib required, bundle,
        // // lua lib required, no bundle
        // // lua lib not required, bundle
        // // lua lib not required, no bundle

        // if (isBundleEnabled(options)) {
        //     const [bundleDiagnostics, bundleFile] = getBundleResult(program, this.emitHost, files);
        //     diagnostics.push(...bundleDiagnostics);
        //     emitPlan = [bundleFile];
        // } else {
        //     emitPlan = files.map(file => {
        //         const pathInOutDir = path.resolve(outDir, path.relative(rootDir, file.fileName));
        //         const outputPath = normalizeSlashes(trimExtension(pathInOutDir) + ".lua");
        //         return { ...file, outputPath };
        //     });
        // }

        return { emitPlan };
    }

    private getEmitFilesNoBundle(files: ProcessedFile[], outDir: string, rootDir: string): EmitFile[] {
        return files.map(file => {
            const pathInOutDir = path.resolve(outDir, path.relative(rootDir, file.fileName));
            const outputPath = normalizeSlashes(trimExtension(pathInOutDir) + ".lua");
            return { ...file, outputPath };
        });
    }

    private getEmitFileBundled(program: ts.Program, diagnostics: ts.Diagnostic[], files: ProcessedFile[]): EmitFile {
        const [bundleDiagnostics, bundleFile] = getBundleResult(program, this.emitHost, files);
        diagnostics.push(...bundleDiagnostics);
        return bundleFile;
    }
}
