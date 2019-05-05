import * as path from "path";
import * as resolve from "resolve";
import * as ts from "typescript";
import { CompilerOptions } from "./CompilerOptions";
import * as diagnosticFactories from "./diagnostics";
import { Block } from "./LuaAST";
import { LuaPrinter } from "./LuaPrinter";
import { LuaTransformer } from "./LuaTransformer";
import { TranspileError } from "./TranspileError";

function loadTransformersFromOptions(
    program: ts.Program,
    diagnostics: ts.Diagnostic[]
): ts.CustomTransformers {
    const customTransformers: Required<ts.CustomTransformers> = {
        before: [],
        after: [],
        afterDeclarations: [],
    };

    const options = program.getCompilerOptions() as CompilerOptions;
    if (!options.tsTransformers) return customTransformers;

    const configFileName = options.configFilePath as string | undefined;
    const basedir = configFileName ? path.dirname(configFileName) : process.cwd();

    const extensions = [".ts", ".tsx", ".js"];
    for (const [index, transformer] of options.tsTransformers.entries()) {
        const transformerOptionPath = `tsTransformers[${index}]`;
        const { name, when = "before", ...transformerOptions } = transformer;

        if (typeof name !== "string") {
            const optionName = `${transformerOptionPath}.name`;
            diagnostics.push(
                diagnosticFactories.compilerOptionRequiresAValueOfType(optionName, "string")
            );

            continue;
        }

        const whenValues = ["before", "after", "afterDeclarations"];
        if (!whenValues.includes(when)) {
            const optionName = `--${transformerOptionPath}.when`;
            diagnostics.push(
                diagnosticFactories.argumentForOptionMustBe(optionName, whenValues.join(", "))
            );

            continue;
        }

        let resolved: string;
        try {
            resolved = resolve.sync(name, { extensions, basedir });
        } catch (err) {
            if (err.code !== "MODULE_NOT_FOUND") throw err;
            diagnostics.push(diagnosticFactories.couldNotResolveTransformerFrom(name, basedir));

            continue;
        }

        // tslint:disable-next-line: deprecation
        const hasNoTsRequireHook = require.extensions[".ts"] === undefined;
        if (hasNoTsRequireHook && (resolved.endsWith(".ts") || resolved.endsWith(".tsx"))) {
            try {
                const tsNodePath = resolve.sync("ts-node", { basedir });
                const tsNode: typeof import("ts-node") = require(tsNodePath);
                tsNode.register({ transpileOnly: true });
            } catch (err) {
                if (err.code !== "MODULE_NOT_FOUND") throw err;
                diagnostics.push(diagnosticFactories.toLoadTransformerItShouldBeTranspiled(name));

                continue;
            }
        }

        const result = require(resolved).default;
        if (result !== undefined) {
            customTransformers[when].push(result(program, transformerOptions));
        } else {
            diagnostics.push(diagnosticFactories.transformerShouldHaveADefaultExport(name));
        }
    }

    return customTransformers;
}

function getCustomTransformers(
    program: ts.Program,
    diagnostics: ts.Diagnostic[],
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

    const transformersFromConfig = loadTransformersFromOptions(program, diagnostics);
    return {
        afterDeclarations: [
            ...(transformersFromConfig.afterDeclarations || []),
            ...(customTransformers.afterDeclarations || []),
        ],
        before: [
            ...(customTransformers.before || []),
            ...(transformersFromConfig.before || []),

            ...(transformersFromConfig.after || []),
            ...(customTransformers.after || []),
            luaTransformer,
        ],
    };
}

export interface TranspiledFile {
    fileName: string;
    luaAst?: Block;
    lua?: string;
    sourceMap?: string;
    declaration?: string;
    declarationMap?: string;
}

export interface TranspileResult {
    diagnostics: ts.Diagnostic[];
    transpiledFiles: TranspiledFile[];
}

export interface TranspileOptions {
    program: ts.Program;
    sourceFiles?: ts.SourceFile[];
    customTransformers?: ts.CustomTransformers;
    transformer?: LuaTransformer;
    printer?: LuaPrinter;
}

export function transpile({
    program,
    sourceFiles: targetSourceFiles,
    customTransformers = {},
    transformer = new LuaTransformer(program),
    printer = new LuaPrinter(program.getCompilerOptions()),
}: TranspileOptions): TranspileResult {
    const options = program.getCompilerOptions() as CompilerOptions;

    const diagnostics: ts.Diagnostic[] = [];
    let transpiledFiles: TranspiledFile[] = [];

    // TODO: Included in TS3.5
    type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
    const updateTranspiledFile = (fileName: string, update: Omit<TranspiledFile, "fileName">) => {
        const file = transpiledFiles.find(f => f.fileName === fileName);
        if (file) {
            Object.assign(file, update);
        } else {
            transpiledFiles.push({ fileName, ...update });
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
            const [luaAst, lualibFeatureSet] = transformer.transformSourceFile(sourceFile);
            if (!options.noEmit && !options.emitDeclarationOnly) {
                const [lua, sourceMap] = printer.print(
                    luaAst,
                    lualibFeatureSet,
                    sourceFile.fileName
                );
                updateTranspiledFile(sourceFile.fileName, { luaAst, lua, sourceMap });
            }
        } catch (err) {
            if (!(err instanceof TranspileError)) throw err;

            diagnostics.push(diagnosticFactories.transpileError(err));

            updateTranspiledFile(sourceFile.fileName, {
                lua: `error(${JSON.stringify(err.message)})\n`,
                sourceMap: "",
            });
        }
    };

    const transformers = getCustomTransformers(
        program,
        diagnostics,
        customTransformers,
        processSourceFile
    );

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
        for (const file of targetSourceFiles) {
            if (isEmittableJsonFile(file)) {
                processSourceFile(file);
            } else {
                diagnostics.push(
                    ...program.emit(file, writeFile, undefined, false, transformers).diagnostics
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
        transpiledFiles = [];
    }

    return { diagnostics, transpiledFiles };
}
