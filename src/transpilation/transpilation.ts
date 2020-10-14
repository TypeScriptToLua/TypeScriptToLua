import { Resolver, ResolverFactory } from "enhanced-resolve";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled, LuaTarget } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { assert, cast, isNonNull, normalizeSlashes, trimExtension } from "../utils";
import { Chunk, modulesToBundleChunks, modulesToChunks } from "./chunk";
import { createResolutionErrorDiagnostic } from "./diagnostics";
import { buildModule, Module } from "./module";
import { Transpiler } from "./transpiler";
import { EmitHost } from "./utils";

export class Transpilation {
    public readonly diagnostics: ts.Diagnostic[] = [];
    private modules: Module[] = [];

    public options = this.program.getCompilerOptions() as CompilerOptions;
    public rootDir: string;
    public outDir: string;
    public emitHost: EmitHost;

    private readonly implicitScriptExtensions = [".ts", ".tsx", ".js", ".jsx"] as const;
    protected resolver: Resolver;

    constructor(public transpiler: Transpiler, public program: ts.Program) {
        this.emitHost = transpiler.emitHost;

        const { rootDir } = program.getCompilerOptions();
        this.rootDir =
            // getCommonSourceDirectory ignores provided rootDir when TS6059 is emitted
            rootDir == null
                ? program.getCommonSourceDirectory()
                : ts.getNormalizedAbsolutePath(rootDir, this.emitHost.getCurrentDirectory());

        this.outDir = this.options.outDir ?? this.rootDir;

        this.resolver = ResolverFactory.createResolver({
            extensions: [".lua", ...this.implicitScriptExtensions],
            conditionNames: ["lua", `lua:${this.options.luaTarget ?? LuaTarget.Universal}`],
            fileSystem: this.emitHost.resolutionFileSystem ?? fs,
            useSyncFileSystemCalls: true,
        });
    }

    public emit(programModules: Module[]): Chunk[] {
        programModules.forEach(module => this.modules.push(module));
        programModules.forEach(module => this.buildModule(module));

        const lualibRequired = this.modules.some(m => m.code.toString().includes('require("lualib_bundle")'));
        if (lualibRequired) {
            const fileName = normalizeSlashes(path.resolve(this.rootDir, "lualib_bundle.lua"));
            this.modules.unshift({ request: fileName, code: getLuaLibBundle(this.emitHost), isBuilt: true });
        }

        return this.mapModulesToChunks(this.modules);
    }

    private buildModule(module: Module) {
        buildModule(module, request => {
            let resolvedModule: Module;
            try {
                resolvedModule = this.resolveRequestToModule(module.request, request);
            } catch (error) {
                this.diagnostics.push(createResolutionErrorDiagnostic(error.message, request, module.request));
                return { error: error.message };
            }

            return this.getModuleId(resolvedModule);
        });
    }

    private resolveRequestToModule(issuer: string, request: string) {
        const resolvedPath = this.resolver.resolveSync({}, path.dirname(issuer), request);
        assert(typeof resolvedPath === "string", `Invalid resolution result: ${resolvedPath}`);

        let module = this.modules.find(m => m.request === resolvedPath);
        if (!module) {
            if (
                this.implicitScriptExtensions.some(extension => resolvedPath.endsWith(extension)) ||
                resolvedPath.endsWith(".json")
            ) {
                throw new Error(`Resolved source file '${resolvedPath}' is not a part of the project.`);
            }

            // TODO: Load source map files
            module = {
                request: resolvedPath,
                code: cast(this.emitHost.readFile(resolvedPath), isNonNull),
                isBuilt: false,
            };

            this.modules.push(module);
            this.buildModule(module);
        }

        return module;
    }

    public getModuleId(module: Module) {
        const result = path.relative(this.rootDir, trimExtension(module.request));
        // TODO: handle files on other drives
        assert(!path.isAbsolute(result), `Invalid path: ${result}`);
        return result
            .replace(/\.\.[/\\]/g, "_/")
            .replace(/\./g, "__")
            .replace(/[/\\]/g, ".");
    }

    private mapModulesToChunks(modules: Module[]): Chunk[] {
        return isBundleEnabled(this.options) ? modulesToBundleChunks(this, modules) : modulesToChunks(this, modules);
    }
}
