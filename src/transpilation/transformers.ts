import * as ts from "typescript";
// TODO: Don't depend on CLI?
import * as cliDiagnostics from "../cli/diagnostics";
import { CompilerOptions, TransformerImport } from "../CompilerOptions";
import * as diagnosticFactories from "./diagnostics";
import { getConfigDirectory, resolvePlugin } from "./utils";

export function getTransformers(
    program: ts.Program,
    diagnostics: ts.Diagnostic[],
    customTransformers: ts.CustomTransformers,
    onSourceFile: (sourceFile: ts.SourceFile) => void
): ts.CustomTransformers {
    const luaTransformer: ts.TransformerFactory<ts.SourceFile> = () => sourceFile => {
        onSourceFile(sourceFile);
        return ts.createSourceFile(sourceFile.fileName, "", ts.ScriptTarget.ESNext);
    };

    const transformersFromOptions = loadTransformersFromOptions(program, diagnostics);

    const afterDeclarations = [
        ...(transformersFromOptions.afterDeclarations ?? []),
        ...(customTransformers.afterDeclarations ?? []),
    ];

    const options = program.getCompilerOptions() as CompilerOptions;
    if (options.noImplicitSelf) {
        afterDeclarations.unshift(noImplicitSelfTransformer);
    }

    return {
        afterDeclarations,
        before: [
            ...(customTransformers.before ?? []),
            ...(transformersFromOptions.before ?? []),

            ...(transformersFromOptions.after ?? []),
            ...(customTransformers.after ?? []),
            stripParenthesisExpressionsTransformer,
            luaTransformer,
        ],
    };
}

export const noImplicitSelfTransformer: ts.TransformerFactory<ts.SourceFile | ts.Bundle> = () => node => {
    const transformSourceFile: ts.Transformer<ts.SourceFile> = node => {
        const empty = ts.factory.createNotEmittedStatement(undefined!);
        ts.addSyntheticLeadingComment(empty, ts.SyntaxKind.MultiLineCommentTrivia, "* @noSelfInFile ", true);
        return ts.factory.updateSourceFile(node, [empty, ...node.statements], node.isDeclarationFile);
    };

    return ts.isBundle(node)
        ? ts.factory.updateBundle(node, node.sourceFiles.map(transformSourceFile))
        : transformSourceFile(node);
};

export const stripParenthesisExpressionsTransformer: ts.TransformerFactory<ts.SourceFile> = context => sourceFile => {
    // Remove parenthesis expressions before transforming to Lua, so transpiler is not hindered by extra ParenthesizedExpression nodes
    function unwrapParentheses(node: ts.Expression) {
        while (ts.isParenthesizedExpression(node) && !ts.isOptionalChain(node.expression)) {
            node = node.expression;
        }
        return node;
    }
    function visit(node: ts.Node): ts.Node {
        // For now only call expressions strip their expressions of parentheses, there could be more cases where this is required
        if (ts.isCallExpression(node)) {
            return ts.factory.updateCallExpression(
                node,
                unwrapParentheses(node.expression),
                node.typeArguments,
                node.arguments
            );
        } else if (ts.isVoidExpression(node)) {
            return ts.factory.updateVoidExpression(node, unwrapParentheses(node.expression));
        } else if (ts.isDeleteExpression(node)) {
            return ts.factory.updateDeleteExpression(node, unwrapParentheses(node.expression));
        }

        return ts.visitEachChild(node, visit, context);
    }
    return ts.visitEachChild(sourceFile, visit, context);
};

function loadTransformersFromOptions(program: ts.Program, diagnostics: ts.Diagnostic[]): ts.CustomTransformers {
    const customTransformers: Required<ts.CustomTransformers> = {
        before: [],
        after: [],
        afterDeclarations: [],
    };

    const options = program.getCompilerOptions() as CompilerOptions;
    if (options.plugins) {
        for (const [index, transformerImport] of options.plugins.entries()) {
            if (!("transform" in transformerImport)) continue;
            const optionName = `compilerOptions.plugins[${index}]`;

            const { error: resolveError, result: factory } = resolvePlugin(
                "transformer",
                `${optionName}.transform`,
                getConfigDirectory(options),
                transformerImport.transform,
                transformerImport.import
            );

            if (resolveError) diagnostics.push(resolveError);
            if (factory === undefined) continue;

            const { error: loadError, transformer } = loadTransformer(optionName, program, factory, transformerImport);
            if (loadError) diagnostics.push(loadError);
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
    }
    if (options.jsx === ts.JsxEmit.React) {
        customTransformers.before.push(context => {
            // if target < ES2017, typescript generates some unnecessary additional transformations in transformJSX.
            // We can't control the target compiler option, so we override here.
            const patchedContext: ts.TransformationContext = {
                ...context,
                getCompilerOptions: () => ({
                    ...context.getCompilerOptions(),
                    target: ts.ScriptTarget.ESNext,
                }),
            };
            return ts.transformJsx(patchedContext);
        });
    }
    return customTransformers;
}

type ProgramTransformerFactory = (program: ts.Program, options: Record<string, any>) => Transformer;
type ConfigTransformerFactory = (options: Record<string, any>) => Transformer;
type CompilerOptionsTransformerFactory = (
    compilerOptions: CompilerOptions,
    options: Record<string, any>
) => Transformer;
type TypeCheckerTransformerFactory = (typeChecker: ts.TypeChecker, options: Record<string, any>) => Transformer;
type RawTransformerFactory = Transformer;

type Transformer = GroupTransformer | ts.TransformerFactory<ts.SourceFile>;
interface GroupTransformer {
    before?: ts.TransformerFactory<ts.SourceFile>;
    after?: ts.TransformerFactory<ts.SourceFile>;
    afterDeclarations?: ts.TransformerFactory<ts.SourceFile | ts.Bundle>;
}

function loadTransformer(
    optionPath: string,
    program: ts.Program,
    factory: unknown,
    { transform, after = false, afterDeclarations = false, type = "program", ...extraOptions }: TransformerImport
): { error?: ts.Diagnostic; transformer?: GroupTransformer } {
    let transformer: Transformer;
    switch (type) {
        case "program":
            transformer = (factory as ProgramTransformerFactory)(program, extraOptions);
            break;
        case "config":
            transformer = (factory as ConfigTransformerFactory)(extraOptions);
            break;
        case "checker":
            transformer = (factory as TypeCheckerTransformerFactory)(program.getTypeChecker(), extraOptions);
            break;
        case "raw":
            transformer = factory as RawTransformerFactory;
            break;
        case "compilerOptions":
            transformer = (factory as CompilerOptionsTransformerFactory)(program.getCompilerOptions(), extraOptions);
            break;
        default: {
            const optionName = `--${optionPath}.type`;
            return { error: cliDiagnostics.argumentForOptionMustBe(optionName, "program") };
        }
    }

    if (typeof after !== "boolean") {
        const optionName = `${optionPath}.after`;
        return { error: cliDiagnostics.compilerOptionRequiresAValueOfType(optionName, "boolean") };
    }

    if (typeof afterDeclarations !== "boolean") {
        const optionName = `${optionPath}.afterDeclarations`;
        return { error: cliDiagnostics.compilerOptionRequiresAValueOfType(optionName, "boolean") };
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
            (transformer.before ?? transformer.after ?? transformer.afterDeclarations) !== undefined;

        if (!isValidGroupTransformer) {
            return { error: diagnosticFactories.transformerShouldBeATsTransformerFactory(transform) };
        }
    }

    return { transformer };
}
