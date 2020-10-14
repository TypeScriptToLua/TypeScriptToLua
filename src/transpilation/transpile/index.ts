import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, validateOptions } from "../../CompilerOptions";
import { createPrinter } from "../../LuaPrinter";
import { createVisitorMap, transformSourceFile } from "../../transformation";
import { assert, isNonNull } from "../../utils";
import { Transpilation } from "../transpilation";
import { getPlugins, Plugin } from "./plugins";
import { getTransformers } from "./transformers";

export { Plugin };

export interface TranspileOptions {
    program: ts.Program;
    sourceFiles?: ts.SourceFile[];
    customTransformers?: ts.CustomTransformers;
    plugins?: Plugin[];
}

export function emitProgramModules(
    transpilation: Transpilation,
    writeFileResult: ts.WriteFileCallback,
    { program, sourceFiles: targetSourceFiles, customTransformers = {}, plugins: customPlugins = [] }: TranspileOptions
) {
    const options = program.getCompilerOptions() as CompilerOptions;

    transpilation.diagnostics.push(...validateOptions(options));

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
            transpilation.diagnostics.push(...preEmitDiagnostics);
            return;
        }
    }

    const plugins = getPlugins(transpilation, customPlugins);
    const visitorMap = createVisitorMap(plugins.map(p => p.visitors).filter(isNonNull));
    const printer = createPrinter(plugins.map(p => p.printer).filter(isNonNull));
    const processSourceFile = (sourceFile: ts.SourceFile) => {
        const { luaAst, luaLibFeatures, diagnostics: transformDiagnostics } = transformSourceFile(
            program,
            sourceFile,
            visitorMap
        );

        transpilation.diagnostics.push(...transformDiagnostics);
        if (!options.noEmit && !options.emitDeclarationOnly) {
            const printResult = printer(program, transpilation.host, sourceFile.fileName, luaAst, luaLibFeatures);

            let fileName: string;
            if (path.isAbsolute(sourceFile.fileName)) {
                fileName = sourceFile.fileName;
            } else {
                const currentDirectory = transpilation.host.getCurrentDirectory();
                // Having no absolute path in path.resolve would make it fallback to real cwd
                assert(path.isAbsolute(currentDirectory), `Invalid path: ${currentDirectory}`);
                fileName = path.resolve(currentDirectory, sourceFile.fileName);
            }

            transpilation.modules.push({
                sourceFiles: [sourceFile],
                request: fileName,
                isBuilt: false,
                ...printResult,
            });
        }
    };

    const transformers = getTransformers(transpilation, customTransformers, processSourceFile);

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
                transpilation.diagnostics.push(...diagnostics);
            }
        }
    } else {
        const { diagnostics } = program.emit(undefined, writeFile, undefined, false, transformers);
        transpilation.diagnostics.push(...diagnostics);

        // JSON files don't get through transformers and aren't written when outDir is the same as rootDir
        program.getSourceFiles().filter(isEmittableJsonFile).forEach(processSourceFile);
    }

    options.noEmit = oldNoEmit;
}
