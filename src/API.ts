import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { parseConfigFileContent } from "./CommandLineParser";
import { CompilerOptions } from "./CompilerOptions";
import { getTranspileOutput, TranspiledFile, TranspilationResult } from "./Transpile";

export function transpileFiles(
    rootNames: string[],
    options: CompilerOptions = {}
): TranspilationResult {
    const program = ts.createProgram(rootNames, options);
    const { diagnostics, transpiledFiles } = getTranspileOutput({ program, options });

    const allDiagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...diagnostics,
    ]);

    return { transpiledFiles, diagnostics: [...allDiagnostics] };
}

export function transpileProject(
    fileName: string,
    options?: CompilerOptions
): TranspilationResult {
    const parseResult = parseConfigFileContent(
        fs.readFileSync(fileName, "utf8"),
        fileName,
        options
    );
    if (parseResult.isValid === false) {
        // TODO: Return diagnostics
        throw new Error(parseResult.errorMessage);
    }

    return transpileFiles(parseResult.result.fileNames, parseResult.result.options);
}

const libCache: { [key: string]: ts.SourceFile } = {};
export function createVirtualProgram(
    input: Record<string, string>,
    options?: CompilerOptions
): ts.Program {
    const compilerHost: ts.CompilerHost = {
        fileExists: () => true,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: ts.getDefaultLibFileName,
        readFile: () => "",
        getNewLine: () => "\n",
        useCaseSensitiveFileNames: () => false,
        writeFile: () => {},

        getSourceFile: filename => {
            if (filename in input) {
                return ts.createSourceFile(
                    filename,
                    input[filename],
                    ts.ScriptTarget.Latest,
                    false
                );
            }

            if (filename.startsWith("lib.")) {
                if (libCache[filename]) return libCache[filename];
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                const filePath = path.join(typeScriptDir, filename);
                const content = fs.readFileSync(filePath, "utf8");

                libCache[filename] = ts.createSourceFile(
                    filename,
                    content,
                    ts.ScriptTarget.Latest,
                    false
                );

                return libCache[filename];
            }
        },
    };

    return ts.createProgram(Object.keys(input), options, compilerHost);
}

export interface TranspileStringResult {
    file: TranspiledFile;
    diagnostics: ts.Diagnostic[];
}

export function transpileString(
    input: string | Record<string, string>,
    options: CompilerOptions = {}
): TranspileStringResult {
    const programFiles = typeof input === "object" ? input : { "main.ts": input };
    const mainFileName =
        typeof input === "string"
            ? "main.ts"
            : Object.keys(input).find(x => /\bmain\.[a-z]+$/.test(x));
    if (mainFileName === undefined) throw new Error('Input should have a file named "main"');

    const program = createVirtualProgram(programFiles, options);
    const { diagnostics, transpiledFiles } = getTranspileOutput({ program, options });

    const allDiagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...diagnostics,
    ]);

    return { file: transpiledFiles.get(mainFileName), diagnostics: [...allDiagnostics] };
}
