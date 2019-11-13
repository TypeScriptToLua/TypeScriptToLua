import { Diagnostic } from "typescript";
import { CompilerOptions } from "./CompilerOptions";
import { TranspiledFile } from "./Transpile";
import { bundlerTransformer } from "./BundlerTransformer";

export interface CustomLuaTransformers {
    /** Custom transformers to evaluate before printing */
    before: LuaProjectTransformer[];
    /** Custom transformers to evaluate after printing */
    after: LuaProjectTransformer[];
}

export type LuaProjectTransformer = (projectFiles: TranspiledFile[]) => TranspiledFile[];

export function getCustomLuaTransformers(
    options: CompilerOptions,
    diagnostics: Diagnostic[]
    //customTransformers: ts.CustomTransformers,
): CustomLuaTransformers {
    const beforePrinting: LuaProjectTransformer[] = [];
    if (options.outFile) {
        beforePrinting.push(bundlerTransformer(options.outFile));
    }

    const afterPrinting: LuaProjectTransformer[] = [];

    return {
        before: beforePrinting,
        after: afterPrinting,
    };
}
