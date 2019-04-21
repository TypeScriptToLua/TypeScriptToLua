import * as ts from "typescript";
import { CompilerOptions } from "./CompilerOptions";
import { LuaPrinter } from "./LuaPrinter";
import { LuaTransformer } from "./LuaTransformer";
import { TranspileError } from "./TranspileError";

function getCustomTransformers(
    options: CompilerOptions,
    customTransformers: ts.CustomTransformers,
    onSourceFile: (sourceFile: ts.SourceFile) => void
): ts.CustomTransformers {
    // TODO: https://github.com/Microsoft/TypeScript/issues/28310
    const forEachSourceFile = (
        node: ts.SourceFile,
        callback: (sourceFile: ts.SourceFile) => ts.SourceFile
    ) =>
        ts.isBundle(node)
            ? ((ts.updateBundle(node, node.sourceFiles.map(callback)) as unknown) as ts.SourceFile)
            : callback(node);

    const luaTransformer: ts.TransformerFactory<ts.SourceFile> = () => node =>
        forEachSourceFile(node, sourceFile => {
            onSourceFile(sourceFile);
            return ts.createSourceFile(sourceFile.fileName, "", ts.ScriptTarget.ESNext);
        });

    return {
        afterDeclarations: customTransformers.afterDeclarations,
        before: [
            ...(customTransformers.before || []),
            ...(customTransformers.after || []),
            luaTransformer,
        ],
    };
}

export interface TranspiledFile {
    lua?: string;
    sourceMap?: string;
    declaration?: string;
    declarationMap?: string;
}

export interface TranspileResult {
    diagnostics: ts.Diagnostic[];
    transpiledFiles: Map<string, TranspiledFile>;
}

export interface TranspileOptions {
    program: ts.Program;
    customTransformers?: ts.CustomTransformers;
    sourceFiles?: ts.SourceFile[];
    printer?: LuaPrinter;
    transformer?: LuaTransformer;
}

export function transpile({
    program,
    customTransformers = {},
    sourceFiles: targetSourceFiles,
    printer,
    transformer,
}: TranspileOptions): TranspileResult {
    const options = program.getCompilerOptions() as CompilerOptions;
    printer = printer || new LuaPrinter(options);
    transformer = transformer || new LuaTransformer(program, options);

    const diagnostics: ts.Diagnostic[] = [];
    const transpiledFiles = new Map<string, TranspiledFile>();
    const updateTranspiledFile = (filePath: string, file: TranspiledFile) => {
        if (transpiledFiles.has(filePath)) {
            Object.assign(transpiledFiles.get(filePath), file);
        } else {
            transpiledFiles.set(filePath, file);
        }
    };

    if (options.noEmitOnError) {
        const preEmitDiagnostics = [
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

    const processSourceFile = (sourceFile: ts.SourceFile) => {
        try {
            const [luaAST, lualibFeatureSet] = transformer!.transformSourceFile(sourceFile);
            if (!options.noEmit && !options.emitDeclarationOnly) {
                const [lua, sourceMap] = printer!.print(
                    luaAST,
                    lualibFeatureSet,
                    sourceFile.fileName
                );
                updateTranspiledFile(sourceFile.fileName, { lua, sourceMap });
            }
        } catch (err) {
            if (!(err instanceof TranspileError)) throw err;

            diagnostics.push({
                category: ts.DiagnosticCategory.Error,
                code: 0,
                file: err.node.getSourceFile(),
                start: err.node.getStart(),
                length: err.node.getWidth(),
                messageText: err.message,
            });

            updateTranspiledFile(sourceFile.fileName, {
                lua: `error(${JSON.stringify(err.message)})\n`,
                sourceMap: "",
            });
        }
    };

    const transformers = getCustomTransformers(options, customTransformers, processSourceFile);

    const writeFile: ts.WriteFileCallback = (fileName, data, _bom, _onError, sourceFiles = []) => {
        for (const sourceFile of sourceFiles) {
            const isDeclaration = fileName.endsWith(".d.ts");
            const isDeclarationMap = fileName.endsWith(".d.ts.map");
            if (isDeclaration) {
                updateTranspiledFile(sourceFile.fileName, { declaration: data });
            } else if (isDeclarationMap) {
                updateTranspiledFile(sourceFile.fileName, { declarationMap: data });
            }
        }
    };

    const isEmittableJsonFile = (sourceFile: ts.SourceFile) =>
        sourceFile.flags & ts.NodeFlags.JsonFile &&
        !options.emitDeclarationOnly &&
        !program.isSourceFileFromExternalLibrary(sourceFile);

    // We always have to emit to get transformer diagnostics
    const oldNoEmit = options.noEmit;
    options.noEmit = false;

    if (targetSourceFiles) {
        for (const sourceFile of targetSourceFiles) {
            if (isEmittableJsonFile(sourceFile)) {
                processSourceFile(sourceFile);
            } else {
                diagnostics.push(
                    ...program.emit(sourceFile, writeFile, undefined, false, transformers)
                        .diagnostics
                );
            }
        }
    } else {
        diagnostics.push(
            ...program.emit(undefined, writeFile, undefined, false, transformers).diagnostics
        );

        // JSON files don't get through transformers and aren't written when outDir is the same as rootDir
        program
            .getSourceFiles()
            .filter(isEmittableJsonFile)
            .forEach(processSourceFile);
    }

    options.noEmit = oldNoEmit;

    if (options.noEmit || (options.noEmitOnError && diagnostics.length > 0)) {
        transpiledFiles.clear();
    }

    return { diagnostics, transpiledFiles };
}
