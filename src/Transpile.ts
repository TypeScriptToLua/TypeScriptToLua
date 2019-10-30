import * as ts from "typescript";
import { CompilerOptions } from "./CompilerOptions";
import { Block } from "./LuaAST";
import { createPrinter } from "./LuaPrinter";
import { Plugin } from "./plugins";
import { createVisitorMap, transformSourceFile } from "./transformation";
import { getCustomTransformers } from "./TSTransformers";
import { isNonNull } from "./utils";

export interface TranspiledFile {
    fileName: string;
    luaAst?: Block;
    lua?: string;
    sourceMap?: string;
    declaration?: string;
    declarationMap?: string;
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
    readFile(path: string): string | undefined;
}

export function transpile({
    program,
    sourceFiles: targetSourceFiles,
    customTransformers = {},
    plugins = [],
    emitHost = ts.sys,
}: TranspileOptions): TranspileResult {
    const options = program.getCompilerOptions() as CompilerOptions;

    const diagnostics: ts.Diagnostic[] = [];
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
        const preEmitDiagnostics = [...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics()];

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

    const visitorMap = createVisitorMap(plugins.map(p => p.visitors).filter(isNonNull));
    const print = createPrinter(program, emitHost, plugins.map(p => p.createPrinter).filter(isNonNull));
    const processSourceFile = (sourceFile: ts.SourceFile) => {
        const { luaAst, luaLibFeatures, diagnostics: transformDiagnostics } = transformSourceFile(
            program,
            sourceFile,
            visitorMap
        );
        diagnostics.push(...transformDiagnostics);
        if (!options.noEmit && !options.emitDeclarationOnly) {
            const { code, sourceMap } = print(luaAst, luaLibFeatures, sourceFile.fileName);
            updateTranspiledFile(sourceFile.fileName, { luaAst, lua: code, sourceMap });
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

    return { diagnostics, transpiledFiles };
}
