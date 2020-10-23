import * as ts from "typescript";
import { parseConfigFileWithSystem } from "../cli/tsconfig";
import { Compiler, EmitResult } from "../compiler";
import { CompilerOptions } from "../CompilerOptions";
import { assert } from "../utils";
import { createEmitOutputCollector, createVirtualProgram, TranspiledFile } from "./utils";

export { TranspiledFile };

export function transpileFiles(
    rootNames: string[],
    options: CompilerOptions = {},
    writeFile?: ts.WriteFileCallback
): EmitResult {
    const program = ts.createProgram(rootNames, options);

    const { diagnostics: emitDiagnostics, emitSkipped } = new Compiler().emit({ program, writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([...ts.getPreEmitDiagnostics(program), ...emitDiagnostics]);

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

    const { diagnostics: emitDiagnostics } = new Compiler().emit({ program, writeFile: collector.writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([...ts.getPreEmitDiagnostics(program), ...emitDiagnostics]);

    return { diagnostics: [...diagnostics], transpiledFiles: collector.files };
}

export interface TranspileStringResult extends TranspiledFile {
    diagnostics: ts.Diagnostic[];
}

export function transpileString(main: string, options: CompilerOptions = {}): TranspileStringResult {
    const { diagnostics, transpiledFiles } = transpileVirtualProject({ "main.ts": main }, options);
    const file = transpiledFiles.find(({ sourceFiles }) => sourceFiles.some(f => f.fileName === "main.ts"));
    assert(file !== undefined);
    return { ...file, diagnostics };
}
