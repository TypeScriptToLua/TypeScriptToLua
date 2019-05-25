import * as path from "path";
import * as resolve from "resolve";
import * as ts from "typescript";
import { CompilerOptions, TransformerImport } from "./CompilerOptions";
import * as diagnosticFactories from "./diagnostics";
import { Block } from "./LuaAST";
import { LuaPrinter } from "./LuaPrinter";
import { LuaTransformer } from "./LuaTransformer";
import { TranspileError } from "./TranspileError";

type ProgramTransformerFactory = (program: ts.Program, options: Record<string, any>) => Transformer;
type ConfigTransformerFactory = (options: Record<string, any>) => Transformer;
type CompilerOptionsTransformerFactory =
    (compilerOptions: CompilerOptions, options: Record<string, any>) => Transformer;
type TypeCheckerTransformerFactory = (typeChecker: ts.TypeChecker, options: Record<string, any>) => Transformer;
type RawTransformerFactory = Transformer;
type TransformerFactory =
    | ProgramTransformerFactory
    | ConfigTransformerFactory
    | CompilerOptionsTransformerFactory
    | TypeCheckerTransformerFactory
    | RawTransformerFactory;

type Transformer = GroupTransformer | ts.TransformerFactory<ts.SourceFile>;
interface GroupTransformer {
    before?: ts.TransformerFactory<ts.SourceFile>;
    after?: ts.TransformerFactory<ts.SourceFile>;
    afterDeclarations?: ts.TransformerFactory<ts.SourceFile | ts.Bundle>;
}

function resolveTransformerFactory(
    basedir: string,
    transformerOptionPath: string,
    { transform, import: importName = 'default' }: TransformerImport
): { error?: ts.Diagnostic; factory?: TransformerFactory } {
    if (typeof transform !== "string") {
        const optionName = `${transformerOptionPath}.transform`;
        return { error: diagnosticFactories.compilerOptionRequiresAValueOfType(optionName, "string") };
    }

    let resolved: string;
    try {
        resolved = resolve.sync(transform, { basedir, extensions: [".js", ".ts", ".tsx"] });
    } catch (err) {
        if (err.code !== "MODULE_NOT_FOUND") throw err;
        return { error: diagnosticFactories.couldNotResolveTransformerFrom(transform, basedir) };
    }

    // tslint:disable-next-line: deprecation
    const hasNoRequireHook = require.extensions[".ts"] === undefined;
    if (hasNoRequireHook && (resolved.endsWith(".ts") || resolved.endsWith(".tsx"))) {
        try {
            const tsNode: typeof import("ts-node") = require("ts-node");
            tsNode.register({ transpileOnly: true });
        } catch (err) {
            if (err.code !== "MODULE_NOT_FOUND") throw err;
            return { error: diagnosticFactories.toLoadTransformerItShouldBeTranspiled(transform) };
        }
    }

    const factory: TransformerFactory = require(resolved)[importName];
    if (factory === undefined) {
        return { error: diagnosticFactories.transformerShouldHaveAExport(transform, importName) };
    }

    return { factory };
}

function loadTransformer(
    transformerOptionPath: string,
    program: ts.Program,
    factory: TransformerFactory,
    { transform, after = false, afterDeclarations = false, type = "program", ...extraOptions }: TransformerImport
): { error?: ts.Diagnostic; transformer?: GroupTransformer } {
    let transformer: Transformer;
    switch (type) {
        case 'program':
            transformer = (factory as ProgramTransformerFactory)(program, extraOptions);
            break;
        case 'config':
            transformer = (factory as ConfigTransformerFactory)(extraOptions);
            break;
        case 'checker':
            transformer = (factory as TypeCheckerTransformerFactory)(program.getTypeChecker(), extraOptions);
            break;
        case 'raw':
            transformer = factory as RawTransformerFactory;
            break;
        case 'compilerOptions':
            transformer = (factory as CompilerOptionsTransformerFactory)(program.getCompilerOptions(), extraOptions);
            break;
        default: {
            const optionName = `--${transformerOptionPath}.type`;
            return { error: diagnosticFactories.argumentForOptionMustBe(optionName, 'program') };
        }
    }

    if (typeof after !== "boolean") {
        const optionName = `${transformerOptionPath}.after`;
        return { error: diagnosticFactories.compilerOptionRequiresAValueOfType(optionName, "boolean") };
    }

    if (typeof afterDeclarations !== "boolean") {
        const optionName = `${transformerOptionPath}.afterDeclarations`;
        return { error: diagnosticFactories.compilerOptionRequiresAValueOfType(optionName, "boolean") };
    }

    if (typeof transformer === "function") {
        let wrappedTransformer: GroupTransformer;

        if (after) {
            wrappedTransformer = { after: transformer };
        } else if (afterDeclarations) {
            wrappedTransformer = { afterDeclarations: transformer as ts.TransformerFactory<ts.SourceFile | ts.Bundle> };
        } else {
            wrappedTransformer = { before: transformer };
        }

        return { transformer: wrappedTransformer };
    } else {
        const isValidGroupTransformer =
            typeof transformer === "object" &&
            (transformer.before || transformer.after || transformer.afterDeclarations);

        if (!isValidGroupTransformer) {
            return { error: diagnosticFactories.transformerShouldBeATsTransformerFactory(transform) };
        }
    }

    return { transformer };
}

function loadTransformersFromOptions(
    program: ts.Program,
    allDiagnostics: ts.Diagnostic[]
): ts.CustomTransformers {
    const customTransformers: Required<ts.CustomTransformers> = {
        before: [],
        after: [],
        afterDeclarations: [],
    };

    const options = program.getCompilerOptions() as CompilerOptions;
    if (!options.plugins) return customTransformers;

    const configFileName = options.configFilePath as string | undefined;
    const basedir = configFileName ? path.dirname(configFileName) : process.cwd();

    for (const [index, transformerImport] of options.plugins.entries()) {
        if ('name' in transformerImport) continue;
        const optionName = `compilerOptions.plugins[${index}]`;

        const { error: resolveError, factory } = resolveTransformerFactory(basedir, optionName, transformerImport);
        if (resolveError) allDiagnostics.push(resolveError);
        if (factory === undefined) continue;

        const { error, transformer } = loadTransformer(optionName, program, factory, transformerImport);
        if (error) allDiagnostics.push(error);
        if (transformer === undefined) continue;

        if (transformer.before) {
            customTransformers.before.push(transformer.before);
        }

        if (transformer.after) {
            customTransformers.after.push(transformer.after);
        }

        if (transformer.afterDeclarations) {
            customTransformers.afterDeclarations.push(transformer.afterDeclarations);
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

    const transformersFromOptions = loadTransformersFromOptions(program, diagnostics);
    return {
        afterDeclarations: [
            ...(transformersFromOptions.afterDeclarations || []),
            ...(customTransformers.afterDeclarations || []),
        ],
        before: [
            ...(customTransformers.before || []),
            ...(transformersFromOptions.before || []),

            ...(transformersFromOptions.after || []),
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
