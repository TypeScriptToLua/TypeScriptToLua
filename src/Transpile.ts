import * as ts from "typescript";
import { CompilerOptions } from "./CompilerOptions";
import * as diagnosticFactories from "./diagnostics";
import { Block } from "./LuaAST";
import { LuaPrinter } from "./LuaPrinter";
import { LuaTransformer } from "./LuaTransformer";
import { TranspileError } from "./TranspileError";
import { getCustomTransformers } from "./TSTransformers";

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
    transformer?: LuaTransformer;
    printer?: LuaPrinter;
    emitHost?: EmitHost;
}

export interface EmitHost {
    readFile(path: string): string | undefined;
}

export function transpile({
    program,
    sourceFiles: targetSourceFiles,
    customTransformers = {},
    emitHost = ts.sys,
    transformer = new LuaTransformer(program),
    printer = new LuaPrinter(program.getCompilerOptions(), emitHost),
}: TranspileOptions): TranspileResult {
    const options = program.getCompilerOptions() as CompilerOptions;

    const diagnostics: ts.Diagnostic[] = [];
    let transpiledFiles: TranspiledFile[] = [];

    // TODO: Included in TS3.5
    type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
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

    const processSourceFile = (sourceFile: ts.SourceFile) => {
        try {
            const [luaAst, lualibFeatureSet] = transformer.transformSourceFile(sourceFile);
            if (!options.noEmit && !options.emitDeclarationOnly) {
                const [lua, sourceMap] = printer.print(luaAst, lualibFeatureSet, sourceFile.fileName);
                updateTranspiledFile(sourceFile.fileName, { luaAst, lua, sourceMap });
            }
        } catch (err) {
            if (!(err instanceof TranspileError)) throw err;

            diagnostics.push(diagnosticFactories.transpileError(err));

            updateTranspiledFile(sourceFile.fileName, {
                lua: `error(${JSON.stringify(err.message)})\n`,
                sourceMap: "",
            });
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
