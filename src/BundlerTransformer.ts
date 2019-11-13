import { TranspiledFile } from "./Transpile";
import { LuaProjectTransformer } from "./CustomLuaTransformers";
import { createBlock, Statement } from "./LuaAST";

type BundlerTransformerFactory = (outFile: string) => LuaProjectTransformer;

function notUndefined<T>(value: T | undefined): value is T {
    return value !== undefined;
}

// TODO: Implement correctly, this is just a PoC!
export const bundlerTransformer: BundlerTransformerFactory = (outFile: string) => (projectFiles: TranspiledFile[]) => {
    const bundledFile: TranspiledFile = {
        fileName: outFile,
        declaration: projectFiles
            .map(f => f.declaration)
            .filter(notUndefined)
            .join("\n"),
        luaAst: createBlock(
            ([] as Statement[]).concat(
                ...projectFiles
                    .map(f => f.luaAst)
                    .filter(notUndefined)
                    .map(ast => ast.statements)
            )
        ),

    };
    return [bundledFile];
};
