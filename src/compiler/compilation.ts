import { Resolver, ResolverFactory } from "enhanced-resolve";
import * as fs from "fs";
import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerMode, CompilerOptions, isBundleEnabled, LuaTarget } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { assert, cast, isNonNull, normalizeSlashes, trimExtension } from "../utils";
import { Chunk, chunkToAssets, modulesToBundleChunks, modulesToChunks } from "./chunk";
import { Compiler, CompilerHost } from "./compiler";
import { createResolutionErrorDiagnostic } from "./diagnostics";
import { buildModule, Module } from "./module";
import { applyBailPlugin, applySinglePlugin, getPlugins, Plugin } from "./plugins";
import { isResolveError } from "./utils";

export class Compilation {
    public readonly diagnostics: ts.Diagnostic[] = [];
    public modules: Module[] = [];

    public host: CompilerHost;
    public options: CompilerOptions = this.program.getCompilerOptions();
    public rootDir: string;
    public outDir: string;
    public projectDir: string;

    public plugins: Plugin[];
    protected resolver: Resolver;

    constructor(public compiler: Compiler, public program: ts.Program, extraPlugins: Plugin[]) {
        this.host = compiler.host;

        this.rootDir =
            // getCommonSourceDirectory ignores provided rootDir when TS6059 is emitted
            this.options.rootDir == null
                ? program.getCommonSourceDirectory()
                : ts.getNormalizedAbsolutePath(this.options.rootDir, this.host.getCurrentDirectory());

        this.outDir = this.options.outDir ?? this.rootDir;

        this.projectDir =
            this.options.configFilePath !== undefined
                ? ts.getDirectoryPath(this.options.configFilePath)
                : this.host.getCurrentDirectory();

        this.plugins = getPlugins(this, extraPlugins);

        this.resolver = ResolverFactory.createResolver({
            extensions: [".lua", ".ts", ".tsx", ".js", ".jsx"],
            conditionNames: ["lua", `lua:${this.options.luaTarget ?? LuaTarget.Universal}`],
            fileSystem: this.host.resolutionFileSystem ?? fs,
            useSyncFileSystemCalls: true,
            plugins: this.plugins.flatMap(p => p.getResolvePlugins?.(this) ?? []),
        });
    }

    public emit(writeFile: ts.WriteFileCallback) {
        this.modules.forEach(module => this.buildModule(module));

        const chunks = this.mapModulesToChunks(this.modules);

        const emitBOM = this.options.emitBOM ?? false;
        for (const chunk of chunks) {
            const { code, sourceMap } = chunkToAssets(chunk, this.options);
            writeFile(chunk.outputPath, code, emitBOM, undefined, chunk.sourceFiles);
            if (sourceMap !== undefined) {
                writeFile(chunk.outputPath + ".map", sourceMap, emitBOM, undefined, chunk.sourceFiles);
            }
        }
    }

    private buildModule(module: Module) {
        if (this.options.mode === CompilerMode.Lib) return;

        buildModule(module, (request, position) => {
            const result = this.resolveRequestToModule(module.fileName, request);
            if ("error" in result) {
                const diagnostic = createResolutionErrorDiagnostic(result.error, module, position);
                this.diagnostics.push(diagnostic);
                return result;
            }

            return this.getModuleId(result);
        });
    }

    private resolveRequestToModule(issuer: string, request: string) {
        if (request === "<internal>/lualib_bundle") {
            let module = this.modules.find(m => m.fileName === request);
            if (!module) {
                const source = new SourceNode(null, null, null, getLuaLibBundle(this.host));
                module = { fileName: request, isBuilt: true, source };
                this.modules.push(module);
            }

            return module;
        }

        let resolvedPath: string;
        try {
            const result = this.resolver.resolveSync({}, ts.getDirectoryPath(issuer), request);
            assert(typeof result === "string", `Invalid resolution result: ${result}`);
            // https://github.com/webpack/enhanced-resolve#escaping
            resolvedPath = normalizeSlashes(result.replace(/\0#/g, "#"));
        } catch (error) {
            if (!isResolveError(error)) throw error;
            return { error: error.message };
        }

        let module = this.modules.find(m => m.fileName === resolvedPath);
        if (!module) {
            if (!resolvedPath.endsWith(".lua")) {
                const messageText = `Resolved source file '${resolvedPath}' is not a part of the project.`;
                return { error: messageText };
            }

            // TODO: Load source map files
            const code = cast(this.host.readFile(resolvedPath), isNonNull);
            const source = new SourceNode(null, null, null, code);
            module = { fileName: resolvedPath, isBuilt: false, source };

            this.modules.push(module);
            this.buildModule(module);
        }

        return module;
    }

    public getModuleId(module: Module) {
        const pluginResult = applyBailPlugin(this.plugins, p => p.getModuleId?.(module, this));
        if (pluginResult !== undefined) return pluginResult;

        if (module.fileName.startsWith("<internal>/")) {
            return module.fileName.replace("<internal>/", "");
        }

        const result = path.relative(this.rootDir, trimExtension(module.fileName));
        // TODO: handle files on other drives
        assert(!path.isAbsolute(result), `Invalid path: ${result}`);
        return result
            .replace(/\.\.[/\\]/g, "_/")
            .replace(/\./g, "__")
            .replace(/[/\\]/g, ".");
    }

    private mapModulesToChunks(modules: Module[]): Chunk[] {
        return (
            applySinglePlugin(this.plugins, "mapModulesToChunks")?.(modules, this) ??
            (isBundleEnabled(this.options) ? modulesToBundleChunks(this, modules) : modulesToChunks(this, modules))
        );
    }
}
