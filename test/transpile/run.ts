import * as ts from "typescript";
import * as tstl from "../../src";
import * as path from "path";

interface BuildVirtualProjectResult {
    diagnostics: ts.Diagnostic[];
    emitResult: tstl.OutputFile[];
    emittedFiles: string[];
}

export function buildVirtualProject(rootNames: string[], options: tstl.CompilerOptions): BuildVirtualProjectResult {
    options.skipLibCheck = true;
    options.types = [];

    const { diagnostics, emitResult } = tstl.transpileFiles(rootNames, options);
    const emittedFiles = emitResult.map(result => path.relative(__dirname, result.name).replace(/\\/g, "/")).sort();

    return { diagnostics, emitResult, emittedFiles };
}
