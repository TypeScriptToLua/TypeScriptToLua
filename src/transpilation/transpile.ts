import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, validateOptions } from "../CompilerOptions";
import { createPrinter } from "../LuaPrinter";
import { createVisitorMap, transformSourceFile } from "../transformation";
import { isNonNull } from "../utils";
import { Plugin } from "./plugins";
import { getTransformers } from "./transformers";
import { EmitHost, ProcessedFile } from "./utils";
import * as performance from "../measure-performance";

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
    { program, sourceFiles: targetSourceFiles, customTransformers = {}, plugins = [] }: TranspileOptions
): TranspileResult {
    performance.startSection("beforeTransform");

    const options = program.getCompilerOptions() as CompilerOptions;

    if (options.tstlVerbose) {
        console.log("Parsing project settings");
    }

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
            performance.endSection("beforeTransform");
            return { diagnostics: preEmitDiagnostics, transpiledFiles };
        }
    }

    for (const plugin of plugins) {
        if (plugin.beforeTransform) {
            const pluginDiagnostics = plugin.beforeTransform(program, options, emitHost) ?? [];
            diagnostics.push(...pluginDiagnostics);
        }
    }

    const visitorMap = createVisitorMap(plugins.map(p => p.visitors).filter(isNonNull));
    const printer = createPrinter(plugins.map(p => p.printer).filter(isNonNull));

    const processSourceFile = (sourceFile: ts.SourceFile) => {
        if (options.tstlVerbose) {
            console.log(`Transforming ${sourceFile.fileName}`);
        }

        performance.startSection("transpile");

        const { file, diagnostics: transformDiagnostics } = transformSourceFile(program, sourceFile, visitorMap);
        diagnostics.push(...transformDiagnostics);

        performance.endSection("transpile");

        if (!options.noEmit && !options.emitDeclarationOnly) {
            performance.startSection("print");
            if (options.tstlVerbose) {
                console.log(`Printing ${sourceFile.fileName}`);
            }

            const printResult = printer(program, emitHost, sourceFile.fileName, file);
            transpiledFiles.push({
                sourceFiles: [sourceFile],
                fileName: path.normalize(sourceFile.fileName),
                luaAst: file,
                ...printResult,
            });
            performance.endSection("print");
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
        if (!fileName.endsWith(".js") && !fileName.endsWith(".js.map") && !fileName.endsWith(".json")) {
            writeFileResult(fileName, ...rest);
        }
    };

    performance.endSection("beforeTransform");

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

    performance.startSection("afterPrint");

    options.noEmit = oldNoEmit;

    if (options.noEmit || (options.noEmitOnError && diagnostics.length > 0)) {
        transpiledFiles = [];
    }

    for (const plugin of plugins) {
        if (plugin.afterPrint) {
            const pluginDiagnostics = plugin.afterPrint(program, options, emitHost, transpiledFiles) ?? [];
            diagnostics.push(...pluginDiagnostics);
        }
    }

    performance.endSection("afterPrint");

    return { diagnostics, transpiledFiles };
}
