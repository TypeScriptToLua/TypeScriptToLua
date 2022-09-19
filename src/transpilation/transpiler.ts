import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled, LuaLibImportKind, LuaTarget } from "../CompilerOptions";
import { buildMinimalLualibBundle, findUsedLualibFeatures, getLuaLibBundle } from "../LuaLib";
import { normalizeSlashes, trimExtension } from "../utils";
import { getBundleResult } from "./bundle";
import { getPlugins, Plugin } from "./plugins";
import { resolveDependencies } from "./resolve";
import { getProgramTranspileResult, TranspileOptions } from "./transpile";
import { EmitFile, EmitHost, ProcessedFile } from "./utils";
import * as performance from "../measure-performance";

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
        const { program, writeFile = this.emitHost.writeFile, plugins: optionsPlugins = [] } = emitOptions;

        const { diagnostics: getPluginsDiagnostics, plugins: configPlugins } = getPlugins(program);
        const plugins = [...optionsPlugins, ...configPlugins];

        const { diagnostics: transpileDiagnostics, transpiledFiles: freshFiles } = getProgramTranspileResult(
            this.emitHost,
            writeFile,
            {
                ...emitOptions,
                plugins,
            }
        );

        const { emitPlan } = this.getEmitPlan(program, transpileDiagnostics, freshFiles, plugins);

        const emitDiagnostics = this.emitFiles(program, plugins, emitPlan, writeFile);

        return {
            diagnostics: getPluginsDiagnostics.concat(transpileDiagnostics, emitDiagnostics),
            emitSkipped: emitPlan.length === 0,
        };
    }

    private emitFiles(
        program: ts.Program,
        plugins: Plugin[],
        emitPlan: EmitFile[],
        writeFile: ts.WriteFileCallback
    ): ts.Diagnostic[] {
        performance.startSection("emit");

        const options = program.getCompilerOptions() as CompilerOptions;

        if (options.tstlVerbose) {
            console.log("Emitting output");
        }

        const diagnostics: ts.Diagnostic[] = [];

        for (const plugin of plugins) {
            if (plugin.beforeEmit) {
                const beforeEmitPluginDiagnostics = plugin.beforeEmit(program, options, this.emitHost, emitPlan) ?? [];
                diagnostics.push(...beforeEmitPluginDiagnostics);
            }
        }

        const emitBOM = options.emitBOM ?? false;
        for (const { outputPath, code, sourceMap, sourceFiles } of emitPlan) {
            if (options.tstlVerbose) {
                console.log(`Emitting ${normalizeSlashes(outputPath)}`);
            }

            writeFile(outputPath, code, emitBOM, undefined, sourceFiles);
            if (options.sourceMap && sourceMap !== undefined) {
                writeFile(outputPath + ".map", sourceMap, emitBOM, undefined, sourceFiles);
            }
        }

        for (const plugin of plugins) {
            if (plugin.afterEmit) {
                const afterEmitPluginDiagnostics = plugin.afterEmit(program, options, this.emitHost, emitPlan) ?? [];
                diagnostics.push(...afterEmitPluginDiagnostics);
            }
        }

        if (options.tstlVerbose) {
            console.log("Emit finished!");
        }

        performance.endSection("emit");

        return diagnostics;
    }

    protected getEmitPlan(
        program: ts.Program,
        diagnostics: ts.Diagnostic[],
        files: ProcessedFile[],
        plugins: Plugin[]
    ): { emitPlan: EmitFile[] } {
        performance.startSection("getEmitPlan");
        const options = program.getCompilerOptions() as CompilerOptions;

        if (options.tstlVerbose) {
            console.log("Constructing emit plan");
        }

        // Resolve imported modules and modify output Lua requires
        const resolutionResult = resolveDependencies(program, files, this.emitHost, plugins);
        diagnostics.push(...resolutionResult.diagnostics);

        const lualibRequired = resolutionResult.resolvedFiles.some(f => f.fileName === (options.luaLibName ?? "lualib_bundle"));
        if (lualibRequired) {
            // Remove lualib placeholders from resolution result
            resolutionResult.resolvedFiles = resolutionResult.resolvedFiles.filter(f => f.fileName !== (options.luaLibName ?? "lualib_bundle"));

            if (options.tstlVerbose) {
                console.log("Including lualib bundle");
            }
            // Add lualib bundle to source dir 'virtually', will be moved to correct output dir in emitPlan
            const fileName = normalizeSlashes(path.resolve(getSourceDir(program), (options.luaLibName ?? "lualib_bundle") + ".lua"));
            const code = this.getLuaLibBundleContent(options, resolutionResult.resolvedFiles);
            resolutionResult.resolvedFiles.unshift({ fileName, code });
        }

        let emitPlan: EmitFile[];
        if (isBundleEnabled(options)) {
            const [bundleDiagnostics, bundleFile] = getBundleResult(program, resolutionResult.resolvedFiles);
            diagnostics.push(...bundleDiagnostics);
            emitPlan = [bundleFile];
        } else {
            emitPlan = resolutionResult.resolvedFiles.map(file => ({
                ...file,
                outputPath: getEmitPath(file.fileName, program),
            }));
        }

        performance.endSection("getEmitPlan");

        return { emitPlan };
    }

    private getLuaLibBundleContent(options: CompilerOptions, resolvedFiles: ProcessedFile[]) {
        const luaTarget = options.luaTarget ?? LuaTarget.Universal;
        if (options.luaLibImport === LuaLibImportKind.RequireMinimal) {
            const usedFeatures = findUsedLualibFeatures(
                luaTarget,
                this.emitHost,
                resolvedFiles.map(f => f.code)
            );
            return buildMinimalLualibBundle(usedFeatures, luaTarget, this.emitHost);
        } else {
            return getLuaLibBundle(luaTarget, this.emitHost);
        }
    }
}

export function getEmitPath(file: string, program: ts.Program): string {
    const relativeOutputPath = getEmitPathRelativeToOutDir(file, program);
    const outDir = getEmitOutDir(program);

    return path.join(outDir, relativeOutputPath);
}

export function getEmitPathRelativeToOutDir(fileName: string, program: ts.Program): string {
    const sourceDir = getSourceDir(program);
    // Default output path is relative path in source dir
    let emitPathSplits = path.relative(sourceDir, fileName).split(path.sep);

    // If source is in a parent directory of source dir, move it into the source dir
    emitPathSplits = emitPathSplits.filter(s => s !== "..");

    // To avoid overwriting lua sources in node_modules, emit into lua_modules
    if (emitPathSplits[0] === "node_modules") {
        emitPathSplits[0] = "lua_modules";
    }

    // Set extension
    const extension = ((program.getCompilerOptions() as CompilerOptions).extension ?? "lua").trim();
    const trimmedExtension = extension.startsWith(".") ? extension.substring(1) : extension;
    emitPathSplits[emitPathSplits.length - 1] =
        trimExtension(emitPathSplits[emitPathSplits.length - 1]) + "." + trimmedExtension;

    return path.join(...emitPathSplits);
}

export function getSourceDir(program: ts.Program): string {
    const rootDir = program.getCompilerOptions().rootDir;
    if (rootDir && rootDir.length > 0) {
        return path.isAbsolute(rootDir) ? rootDir : path.resolve(getProjectRoot(program), rootDir);
    }

    // If no rootDir is given, source is relative to the project root
    return getProjectRoot(program);
}

export function getEmitOutDir(program: ts.Program): string {
    const outDir = program.getCompilerOptions().outDir;
    if (outDir && outDir.length > 0) {
        return path.isAbsolute(outDir) ? outDir : path.resolve(getProjectRoot(program), outDir);
    }

    // If no outDir is provided, emit in project root
    return getProjectRoot(program);
}

export function getProjectRoot(program: ts.Program): string {
    // Try to get the directory the tsconfig is in
    const tsConfigPath = program.getCompilerOptions().configFilePath;
    // If no tsconfig is known, use common source directory
    return tsConfigPath ? path.dirname(tsConfigPath) : program.getCommonSourceDirectory();
}
