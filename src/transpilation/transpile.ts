import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions, validateOptions } from "../CompilerOptions";
import { Block } from "../LuaAST";
import { createPrinter } from "../LuaPrinter";
import { createVisitorMap, transformSourceFile } from "../transformation";
import { isNonNull } from "../utils";
import { bundleTranspiledFiles } from "./bundle";
import { getPlugins, Plugin } from "./plugins";
import { getCustomTransformers } from "./transformers";

export interface TranspiledFile {
    fileName: string;
    luaAst?: Block;
    lua?: string;
    sourceMap?: string;
    declaration?: string;
    declarationMap?: string;
    /** @internal */
    sourceMapNode?: SourceNode;
}

export interface TranspileResult {
    diagnostics: ts.Diagnostic[];
    transpiledFiles: TranspiledFile[];
}

export interface TranspileOptions {
    program: ts.Program;
    sourceFiles?: ts.SourceFile[];
    customTransformers?: ts.CustomTransformers;
    plugins?: Plugin[];
    emitHost?: EmitHost;
}

export interface EmitHost {
    getCurrentDirectory(): string;
    readFile(path: string): string | undefined;
}

export function transpile({
    program,
    sourceFiles: targetSourceFiles,
    customTransformers = {},
    plugins: pluginsFromOptions = [],
    emitHost = ts.sys,
}: TranspileOptions): TranspileResult {
    const options = program.getCompilerOptions() as CompilerOptions;

    const diagnostics = validateOptions(options);
    let transpiledFiles: TranspiledFile[] = [];

    const updateTranspiledFile = (fileName: string, update: Omit<TranspiledFile, "fileName">) => {
        const file = transpiledFiles.find(f => f.fileName === fileName);
        if (file) {
            Object.assign(file, update);
        } else {
            transpiledFiles.push({ fileName, ...update });
        }
    };

    if (options.noEmitOnError) {
        const preEmitDiagnostics = [
            ...diagnostics,
            ...program.getOptionsDiagnostics(),
            ...program.getGlobalDiagnostics(),
        ];

        if (targetSourceFiles) {
            for (const sourceFile of targetSourceFiles) {
                preEmitDiagnostics.push(...program.getSyntacticDiagnostics(sourceFile));
                preEmitDiagnostics.push(...program.getSemanticDiagnostics(sourceFile));
            }
        } else {
            preEmitDiagnostics.push(...program.getSyntacticDiagnostics());
            preEmitDiagnostics.push(...program.getSemanticDiagnostics());
        }

        if (preEmitDiagnostics.length === 0 && (options.declaration || options.composite)) {
            preEmitDiagnostics.push(...program.getDeclarationDiagnostics());
        }

        if (preEmitDiagnostics.length > 0) {
            return { diagnostics: preEmitDiagnostics, transpiledFiles };
        }
    }

    const plugins = getPlugins(program, diagnostics, pluginsFromOptions);
    const visitorMap = createVisitorMap(plugins.map(p => p.visitors).filter(isNonNull));
    const printer = createPrinter(plugins.map(p => p.printer).filter(isNonNull));
    const processSourceFile = (sourceFile: ts.SourceFile) => {
        const { luaAst, luaLibFeatures, diagnostics: transformDiagnostics } = transformSourceFile(
            program,
            sourceFile,
            visitorMap
        );
        diagnostics.push(...transformDiagnostics);
        if (!options.noEmit && !options.emitDeclarationOnly) {
            const { code, sourceMap, sourceMapNode } = printer(
                program,
                emitHost,
                sourceFile.fileName,
                luaAst,
                luaLibFeatures
            );
            updateTranspiledFile(sourceFile.fileName, { luaAst, lua: code, sourceMap, sourceMapNode });
        }
    };

    const transformers = getCustomTransformers(program, diagnostics, customTransformers, processSourceFile);

    const writeFile: ts.WriteFileCallback = (fileName, data, _bom, _onError, sourceFiles = []) => {
        for (const sourceFile of sourceFiles) {
            const isDeclaration = fileName.endsWith(".d.ts");
            const isDeclarationMap = fileName.endsWith(".d.ts.map");
            if (isDeclaration) {
                updateTranspiledFile(sourceFile.fileName, { declaration: data });
            } else if (isDeclarationMap) {
                updateTranspiledFile(sourceFile.fileName, { declarationMap: data });
            }
        }
    };

    const isEmittableJsonFile = (sourceFile: ts.SourceFile) =>
        sourceFile.flags & ts.NodeFlags.JsonFile &&
        !options.emitDeclarationOnly &&
        !program.isSourceFileFromExternalLibrary(sourceFile);

    // We always have to emit to get transformer diagnostics
    const oldNoEmit = options.noEmit;
    options.noEmit = false;

    if (targetSourceFiles) {
        for (const file of targetSourceFiles) {
            if (isEmittableJsonFile(file)) {
                processSourceFile(file);
            } else {
                diagnostics.push(...program.emit(file, writeFile, undefined, false, transformers).diagnostics);
            }
        }
    } else {
        diagnostics.push(...program.emit(undefined, writeFile, undefined, false, transformers).diagnostics);

        // JSON files don't get through transformers and aren't written when outDir is the same as rootDir
        program
            .getSourceFiles()
            .filter(isEmittableJsonFile)
            .forEach(processSourceFile);
    }

    options.noEmit = oldNoEmit;

    if (options.noEmit || (options.noEmitOnError && diagnostics.length > 0)) {
        transpiledFiles = [];
    }

    if (options.luaBundle && options.luaBundleEntry) {
        const [bundleDiagnostics, bundle] = bundleTranspiledFiles(
            options.luaBundle,
            options.luaBundleEntry,
            transpiledFiles,
            program,
            emitHost
        );
        diagnostics.push(...bundleDiagnostics);
        transpiledFiles = [bundle];
    }

    return { diagnostics, transpiledFiles };
}
