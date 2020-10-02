import { ResolverFactory } from "enhanced-resolve";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled, LuaTarget } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { assert, cast, isNonNull, normalizeSlashes, trimExtension } from "../utils";
import { getBundleResult } from "./bundle";
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

    constructor(private emitHost: EmitHost, private program: ts.Program) {}

    private options = this.program.getCompilerOptions() as CompilerOptions;
    private rootDir = this.program.getCommonSourceDirectory();
    private outDir = this.options.outDir ?? this.rootDir;

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
                this.toRequireParameter(this.toGeneratedFileName(file.fileName))
            );
            this.diagnostics.push(...bundleDiagnostics);
            return [bundleFile];
        } else {
            return this.files.map(file => {
                const pathInOutDir = this.toAbsoluteOutputPath(this.toGeneratedFileName(file.fileName));
                const outputPath = normalizeSlashes(trimExtension(pathInOutDir) + ".lua");
                return { ...file, outputPath };
            });
        }
    }

    private handleProcessedFile(file: ProcessedFile) {
        const replacer: ResolveMacroReplacer = (request: string) => {
            let resolvedPath: string;
            try {
                resolvedPath = this.resolveRequest(request, file.fileName);
            } catch (error) {
                this.diagnostics.push({
                    category: ts.DiagnosticCategory.Error,
                    code: -1,
                    file: ts.createSourceFile(file.fileName, "", ts.ScriptTarget.ES3),
                    start: undefined,
                    length: undefined,
                    messageText: error.message,
                });
                return { error: error.message };
            }

            this.handleProcessedFile({
                fileName: resolvedPath,
                code: cast(this.emitHost.readFile(resolvedPath), isNonNull),
                // TODO: Load source map files
            });

            return this.toRequireParameter(this.toGeneratedFileName(resolvedPath));
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

    protected resolver = ResolverFactory.createResolver({
        extensions: [".lua", ".ts", ".tsx", ".js", ".jsx"],
        conditionNames: ["lua", `lua:${this.options.luaTarget ?? LuaTarget.Universal}`],
        fileSystem: this.emitHost.fileSystem ?? fs,
        useSyncFileSystemCalls: true,
    });

    protected resolveRequest(request: string, issuer: string) {
        const result = this.resolver.resolveSync({}, path.dirname(issuer), request);
        assert(typeof result === "string");
        return result;
    }

    protected toGeneratedFileName(fileName: string) {
        const result = path.relative(this.rootDir, trimExtension(fileName));
        // TODO: handle files on other drives
        assert(!path.isAbsolute(result), `Invalid path: ${result}`);
        return result.replace(/\.\.\//g, "_/").replace(/\./g, "__");
    }

    protected toRequireParameter(fileName: string) {
        return fileName.replace(/[/\\]/g, ".");
    }

    protected toAbsoluteOutputPath(fileName: string) {
        return path.resolve(this.outDir, `${fileName}.lua`);
    }
}
