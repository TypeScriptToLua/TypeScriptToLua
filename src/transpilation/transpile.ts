import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, validateOptions } from "../CompilerOptions";
import { createPrinter } from "../LuaPrinter";
import { createVisitorMap, transformSourceFile } from "../transformation";
import { isNonNull } from "../utils";
import { getPlugins, Plugin } from "./plugins";
import { getTransformers } from "./transformers";
import { EmitHost, ProcessedFile } from "./utils";

export interface TranspileOptions {
    program: ts.Program;
    sourceFiles?: ts.SourceFile[];
    customTransformers?: ts.CustomTransformers;
    plugins?: Plugin[];
}

export interface TranspileResult {
    diagnostics: ts.Diagnostic[];
    transpiledFiles: ProcessedFile[];
}

export function getProgramTranspileResult(
    emitHost: EmitHost,
    writeFileResult: ts.WriteFileCallback,
    { program, sourceFiles: targetSourceFiles, customTransformers = {}, plugins: customPlugins = [] }: TranspileOptions
): TranspileResult {
    const options = program.getCompilerOptions() as CompilerOptions;

    const diagnostics = validateOptions(options);
    let transpiledFiles: ProcessedFile[] = [];

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

    const plugins = getPlugins(program, diagnostics, customPlugins);
    const visitorMap = createVisitorMap(plugins.map(p => p.visitors).filter(isNonNull));
    const printer = createPrinter(plugins.map(p => p.printer).filter(isNonNull));
    const processSourceFile = (sourceFile: ts.SourceFile) => {
        const { file, diagnostics: transformDiagnostics } = transformSourceFile(program, sourceFile, visitorMap);

        diagnostics.push(...transformDiagnostics);
        if (!options.noEmit && !options.emitDeclarationOnly) {
            const printResult = printer(program, emitHost, sourceFile.fileName, file);
            const sourceRootDir = program.getCommonSourceDirectory();
            const fileName = path.resolve(sourceRootDir, sourceFile.fileName);
            transpiledFiles.push({ sourceFiles: [sourceFile], fileName, luaAst: file, ...printResult });
        }
    };

    const transformers = getTransformers(program, diagnostics, customTransformers, processSourceFile);

    const isEmittableJsonFile = (sourceFile: ts.SourceFile) =>
        sourceFile.flags & ts.NodeFlags.JsonFile &&
        !options.emitDeclarationOnly &&
        !program.isSourceFileFromExternalLibrary(sourceFile);

    // We always have to run transformers to get diagnostics
    const oldNoEmit = options.noEmit;
    options.noEmit = false;

    const writeFile: ts.WriteFileCallback = (fileName, ...rest) => {
        if (!fileName.endsWith(".js") && !fileName.endsWith(".js.map")) {
            writeFileResult(fileName, ...rest);
        }
    };

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
        program.getSourceFiles().filter(isEmittableJsonFile).forEach(processSourceFile);
    }

    options.noEmit = oldNoEmit;

    if (options.noEmit || (options.noEmitOnError && diagnostics.length > 0)) {
        transpiledFiles = [];
    }

    return { diagnostics, transpiledFiles };
}
