import * as path from "path";
import * as ts from "typescript";
import * as tstl from "../../src";
import { normalizeSlashes } from "../../src/utils";

export function transpileFilesResult(rootNames: string[], options: tstl.CompilerOptions) {
    options.skipLibCheck = true;
    options.types = [];

    const emittedFiles: ts.OutputFile[] = [];
    const { diagnostics } = tstl.transpileFiles(rootNames, options, (fileName, text, writeByteOrderMark) => {
        const name = normalizeSlashes(path.relative(__dirname, fileName));
        emittedFiles.push({ name, text, writeByteOrderMark });
    });

    return { diagnostics, emittedFiles };
}
