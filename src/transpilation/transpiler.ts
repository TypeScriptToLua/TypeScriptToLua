import { ResolverFactory } from "enhanced-resolve";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled, LuaTarget } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { assert, cast, isNonNull, normalizeSlashes, trimExtension } from "../utils";
import { getBundleChunk } from "./bundle";
import { createResolutionErrorDiagnostic } from "./diagnostics";
import { replaceResolveMacroInSource, replaceResolveMacroSourceNodes, MacroDependencyResolver } from "./macro";
import { emitProgramModules, TranspileOptions } from "./transpile";
import { Chunk, EmitHost, Module } from "./utils";

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
        const { diagnostics, modules } = emitProgramModules(this.emitHost, writeFile, emitOptions);
        const emitPlan = this.getEmitPlan(program, diagnostics, modules);

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

    private getEmitPlan(program: ts.Program, diagnostics: ts.Diagnostic[], transpiledFiles: Module[]) {
        const transpilation = new Transpilation(this.emitHost, program);
        const emitPlan = transpilation.emit(transpiledFiles);
        diagnostics.push(...transpilation.diagnostics);
        return emitPlan;
    }
}

class Transpilation {
    public readonly diagnostics: ts.Diagnostic[] = [];
    private seenFiles = new Set<string>();
    private modules: Module[] = [];

    private options = this.program.getCompilerOptions() as CompilerOptions;
    private rootDir: string;
    private outDir: string;

    constructor(private emitHost: EmitHost, private program: ts.Program) {
        const { rootDir } = program.getCompilerOptions();
        this.rootDir =
            // getCommonSourceDirectory ignores provided rootDir when TS6059 is emitted
            rootDir == null
                ? program.getCommonSourceDirectory()
                : ts.getNormalizedAbsolutePath(rootDir, emitHost.getCurrentDirectory());

        this.outDir = this.options.outDir ?? this.rootDir;
    }

    public emit(programModules: Module[]): Chunk[] {
        programModules.forEach(file => this.seenFiles.add(file.fileName));
        programModules.forEach(file => this.addModule(file));

        const lualibRequired = this.modules.some(f => f.code.includes('require("lualib_bundle")'));
        if (lualibRequired) {
            const fileName = normalizeSlashes(path.resolve(this.rootDir, "lualib_bundle.lua"));
            this.modules.unshift({ fileName, code: getLuaLibBundle(this.emitHost) });
        }

        if (isBundleEnabled(this.options)) {
            const [bundleDiagnostics, bundleChunk] = getBundleChunk(this.program, this.emitHost, this.modules, file =>
                this.createModuleId(file.fileName)
            );
            this.diagnostics.push(...bundleDiagnostics);
            return [bundleChunk];
        } else {
            return this.modules.map(file => ({
                ...file,
                outputPath: this.moduleIdToOutputPath(this.createModuleId(file.fileName)),
            }));
        }
    }

    private addModule(module: Module) {
        const dependencyResolver: MacroDependencyResolver = (request: string) => {
            let resolvedPath: string;
            try {
                const result = this.resolver.resolveSync({}, path.dirname(module.fileName), request);
                assert(typeof result === "string");
                resolvedPath = result;
            } catch (error) {
                this.diagnostics.push(createResolutionErrorDiagnostic(error.message, request, module.fileName));
                return { error: error.message };
            }

            if (!this.seenFiles.has(resolvedPath)) {
                if (
                    this.scriptExtensions.some(extension => resolvedPath.endsWith(extension)) ||
                    resolvedPath.endsWith(".json")
                ) {
                    const message = `Resolved source file '${resolvedPath}' is not a part of the project.`;
                    this.diagnostics.push(createResolutionErrorDiagnostic(message, request, module.fileName));
                    return { error: message };
                } else {
                    this.seenFiles.add(resolvedPath);
                    this.addModule({
                        fileName: resolvedPath,
                        code: cast(this.emitHost.readFile(resolvedPath), isNonNull),
                        // TODO: Load source map files
                    });
                }
            }

            return this.createModuleId(resolvedPath);
        };

        if (module.sourceMapNode) {
            replaceResolveMacroSourceNodes(module.sourceMapNode, dependencyResolver);
            const { code, map } = module.sourceMapNode.toStringWithSourceMap();
            module.code = code;
            module.sourceMap = JSON.stringify(map.toJSON());
        } else {
            module.code = replaceResolveMacroInSource(module.code, dependencyResolver);
        }

        this.modules.push(module);
    }

    private readonly scriptExtensions = [".ts", ".tsx", ".js", ".jsx"];
    protected resolver = ResolverFactory.createResolver({
        extensions: [".lua", ...this.scriptExtensions],
        conditionNames: ["lua", `lua:${this.options.luaTarget ?? LuaTarget.Universal}`],
        fileSystem: this.emitHost.resolutionFileSystem ?? fs,
        useSyncFileSystemCalls: true,
    });

    protected createModuleId(fileName: string) {
        const result = path.relative(this.rootDir, trimExtension(fileName));
        // TODO: handle files on other drives
        assert(!path.isAbsolute(result), `Invalid path: ${result}`);
        return result
            .replace(/\.\.[/\\]/g, "_/")
            .replace(/\./g, "__")
            .replace(/[/\\]/g, ".");
    }

    protected moduleIdToOutputPath(moduleId: string) {
        return normalizeSlashes(path.resolve(this.outDir, `${moduleId.replace(/\./g, "/")}.lua`));
    }
}
