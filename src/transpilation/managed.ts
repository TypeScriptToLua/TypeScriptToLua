import * as ts from "typescript";
import { parseConfigFileWithSystem } from "../cli/tsconfig";
import { CompilerOptions } from "../CompilerOptions";
import { createEmitOutputCollector, TranspiledFile } from "./output-collector";
import { EmitResult, Transpiler } from "./transpiler";
import { createVirtualProgram } from "./utils";

export { TranspiledFile };

export function transpileFiles(
    rootNames: string[],
    options: CompilerOptions = {},
    writeFile?: ts.WriteFileCallback
): EmitResult {
    const program = ts.createProgram(rootNames, options);
    const { diagnostics: transpileDiagnostics, emitSkipped } = new Transpiler().emit({ program, writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);

    return { diagnostics: [...diagnostics], emitSkipped };
}

export function transpileProject(
    configFileName: string,
    optionsToExtend?: CompilerOptions,
    writeFile?: ts.WriteFileCallback
): EmitResult {
    const parseResult = parseConfigFileWithSystem(configFileName, optionsToExtend);
    if (parseResult.errors.length > 0) {
        return { diagnostics: parseResult.errors, emitSkipped: true };
    }

    return transpileFiles(parseResult.fileNames, parseResult.options, writeFile);
}

export interface TranspileVirtualProjectResult {
    diagnostics: ts.Diagnostic[];
    transpiledFiles: TranspiledFile[];
}

export function transpileVirtualProject(
    files: Record<string, string>,
    options: CompilerOptions = {}
): TranspileVirtualProjectResult {
    const program = createVirtualProgram(files, options);
    const collector = createEmitOutputCollector();
    const { diagnostics: transpileDiagnostics } = new Transpiler().emit({ program, writeFile: collector.writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);

    return { diagnostics: [...diagnostics], transpiledFiles: collector.files };
}

export interface TranspileStringResult {
    diagnostics: ts.Diagnostic[];
    file?: TranspiledFile;
}

export function transpileString(main: string, options: CompilerOptions = {}): TranspileStringResult {
    const { diagnostics, transpiledFiles } = transpileVirtualProject({ "main.ts": main }, options);
    return {
        diagnostics,
        file: transpiledFiles.find(({ sourceFiles }) => sourceFiles.some(f => f.fileName === "main.ts")),
    };
}
