import * as ts from "typescript";
import { validateOptions } from "../../CompilerOptions";
import { LuaPrinter } from "../../LuaPrinter";
import { createVisitorMap, transformSourceFile } from "../../transformation/transform";
import { isNonNull } from "../../utils";
import { Compilation } from "../compilation";
import { applySinglePlugin } from "../plugins";
import { getTransformers } from "./transformers";

export interface TranspileOptions {
    program: ts.Program;
    sourceFiles?: ts.SourceFile[];
    customTransformers?: ts.CustomTransformers;
}

export function emitProgramModules(
    compilation: Compilation,
    writeFileResult: ts.WriteFileCallback,
    { program, sourceFiles: targetSourceFiles, customTransformers = {} }: TranspileOptions
) {
    const { options } = compilation;
    compilation.diagnostics.push(...validateOptions(options));

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
            compilation.diagnostics.push(...preEmitDiagnostics);
            return;
        }
    }

    const visitorMap = createVisitorMap(compilation.plugins.map(p => p.visitors).filter(isNonNull));
    const printer =
        applySinglePlugin(compilation.plugins, "printer") ??
        ((program, host, fileName, file) => new LuaPrinter(host, program, fileName).print(file));

    const processSourceFile = (sourceFile: ts.SourceFile) => {
        const { file, diagnostics: transformDiagnostics } = transformSourceFile(program, sourceFile, visitorMap);

        compilation.diagnostics.push(...transformDiagnostics);
        if (!options.noEmit && !options.emitDeclarationOnly) {
            const source = printer(program, compilation.host, sourceFile.fileName, file);
            const request = ts.getNormalizedAbsolutePath(sourceFile.fileName, compilation.projectDir);
            compilation.modules.push({ request, isBuilt: false, source, sourceFiles: [sourceFile] });
        }
    };

    const transformers = getTransformers(compilation, customTransformers, processSourceFile);

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
                const { diagnostics } = program.emit(file, writeFile, undefined, false, transformers);
                compilation.diagnostics.push(...diagnostics);
            }
        }
    } else {
        const { diagnostics } = program.emit(undefined, writeFile, undefined, false, transformers);
        compilation.diagnostics.push(...diagnostics);

        // JSON files don't get through transformers and aren't written when outDir is the same as rootDir
        program.getSourceFiles().filter(isEmittableJsonFile).forEach(processSourceFile);
    }

    options.noEmit = oldNoEmit;
}
