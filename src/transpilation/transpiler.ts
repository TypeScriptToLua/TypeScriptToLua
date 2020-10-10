import { ResolverFactory } from "enhanced-resolve";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled, LuaTarget } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { assert, cast, isNonNull, normalizeSlashes, trimExtension } from "../utils";
import { getBundleResult } from "./bundle";
import { createResolutionErrorDiagnostic } from "./diagnostics";
import { replaceResolveMacroInSource, replaceResolveMacroSourceNodes, ResolveMacroReplacer } from "./macro";
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
        const { diagnostics, transpiledFiles } = getProgramTranspileResult(this.emitHost, writeFile, emitOptions);
        const emitPlan = this.getEmitPlan(program, diagnostics, transpiledFiles);

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

    private getEmitPlan(program: ts.Program, diagnostics: ts.Diagnostic[], transpiledFiles: ProcessedFile[]) {
        const transpilation = new Transpilation(this.emitHost, program);
        const emitPlan = transpilation.emit(transpiledFiles);
        diagnostics.push(...transpilation.diagnostics);
        return emitPlan;
    }
}

class Transpilation {
    public readonly diagnostics: ts.Diagnostic[] = [];
    private seenFiles = new Set<string>();
    private files: ProcessedFile[] = [];

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

    public emit(transpiledFiles: ProcessedFile[]): EmitFile[] {
        transpiledFiles.forEach(file => this.seenFiles.add(file.fileName));
        transpiledFiles.forEach(file => this.handleProcessedFile(file));

        const lualibRequired = this.files.some(f => f.code.includes('require("lualib_bundle")'));
        if (lualibRequired) {
            const fileName = normalizeSlashes(path.resolve(this.rootDir, "lualib_bundle.lua"));
            this.files.unshift({ fileName, code: getLuaLibBundle(this.emitHost) });
        }

        if (isBundleEnabled(this.options)) {
            const [bundleDiagnostics, bundleFile] = getBundleResult(this.program, this.emitHost, this.files, file =>
                this.createModuleId(file.fileName)
            );
            this.diagnostics.push(...bundleDiagnostics);
            return [bundleFile];
        } else {
            return this.files.map(file => ({
                ...file,
                outputPath: this.moduleIdToOutputPath(this.createModuleId(file.fileName)),
            }));
        }
    }

    private handleProcessedFile(file: ProcessedFile) {
        const replacer: ResolveMacroReplacer = (request: string) => {
            let resolvedPath: string;
            try {
                const result = this.resolver.resolveSync({}, path.dirname(file.fileName), request);
                assert(typeof result === "string");
                resolvedPath = result;
            } catch (error) {
                this.diagnostics.push(createResolutionErrorDiagnostic(error.message, request, file.fileName));
                return { error: error.message };
            }

            if (!this.seenFiles.has(resolvedPath)) {
                if (
                    this.scriptExtensions.some(extension => resolvedPath.endsWith(extension)) ||
                    resolvedPath.endsWith(".json")
                ) {
                    const message = `Resolved source file '${resolvedPath}' is not a part of the project.`;
                    this.diagnostics.push(createResolutionErrorDiagnostic(message, request, file.fileName));
                    return { error: message };
                } else {
                    this.seenFiles.add(resolvedPath);
                    this.handleProcessedFile({
                        fileName: resolvedPath,
                        code: cast(this.emitHost.readFile(resolvedPath), isNonNull),
                        // TODO: Load source map files
                    });
                }
            }

            return this.createModuleId(resolvedPath);
        };

        if (file.sourceMapNode) {
            replaceResolveMacroSourceNodes(file.sourceMapNode, replacer);
            const { code, map } = file.sourceMapNode.toStringWithSourceMap();
            file.code = code;
            file.sourceMap = JSON.stringify(map.toJSON());
        } else {
            file.code = replaceResolveMacroInSource(file.code, replacer);
        }

        this.files.push(file);
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
