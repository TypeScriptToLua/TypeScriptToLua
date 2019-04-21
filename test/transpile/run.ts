import * as ts from "typescript";
import * as tstl from "../../src";
import * as path from "path";

interface BuildVirtualProjectResult {
    diagnostics: ts.Diagnostic[];
    emitResult: tstl.OutputFile[];
    emittedFiles: string[];
}

export function buildVirtualProject(
    rootNames: string[],
    options: tstl.CompilerOptions,
): BuildVirtualProjectResult {
    options.skipLibCheck = true;
    options.types = [];

    const program = ts.createProgram({ rootNames, options });
    const { transpiledFiles, diagnostics: transpileDiagnostics } = tstl.getTranspilationResult({
        program,
    });

    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);

    const emitResult = tstl.emitTranspiledFiles(options, transpiledFiles);
    const emittedFiles = emitResult
        .map(result => path.relative(__dirname, result.name).replace(/\\/g, "/"))
        .sort();

    return { diagnostics: [...diagnostics], emitResult, emittedFiles };
}
