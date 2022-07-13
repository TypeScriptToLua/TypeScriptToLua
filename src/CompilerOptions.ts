import * as ts from "typescript";
import { JsxEmit } from "typescript";
import * as diagnosticFactories from "./transpilation/diagnostics";

type OmitIndexSignature<T> = {
    [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

export interface TransformerImport {
    transform: string;
    import?: string;
    after?: boolean;
    afterDeclarations?: boolean;
    type?: "program" | "config" | "checker" | "raw" | "compilerOptions";
    [option: string]: any;
}

export interface LuaPluginImport {
    name: string;
    import?: string;
    [option: string]: any;
}

export interface TypeScriptToLuaOptions {
    buildMode?: BuildMode;
    extension?: string;
    luaBundle?: string;
    luaBundleEntry?: string;
    luaTarget?: LuaTarget;
    luaLibImport?: LuaLibImportKind;
    luaPlugins?: LuaPluginImport[];
    noImplicitGlobalVariables?: boolean;
    noImplicitSelf?: boolean;
    noHeader?: boolean;
    noResolvePaths?: string[];
    plugins?: Array<ts.PluginImport | TransformerImport>;
    sourceMapTraceback?: boolean;
    tstlVerbose?: boolean;
    lua51AllowTryCatchInAsyncAwait?: boolean;
    measurePerformance?: boolean;
}

export type CompilerOptions = OmitIndexSignature<ts.CompilerOptions> &
    TypeScriptToLuaOptions & {
        [option: string]: any;
    };

export enum LuaLibImportKind {
    None = "none",
    Inline = "inline",
    Require = "require",
}

export enum LuaTarget {
    Universal = "universal",
    Lua51 = "5.1",
    Lua52 = "5.2",
    Lua53 = "5.3",
    Lua54 = "5.4",
    LuaJIT = "JIT",
}

export enum BuildMode {
    Default = "default",
    Library = "library",
}

export const isBundleEnabled = (options: CompilerOptions) =>
    options.luaBundle !== undefined && options.luaBundleEntry !== undefined;

export function validateOptions(options: CompilerOptions): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];

    if (options.luaBundle && !options.luaBundleEntry) {
        diagnostics.push(diagnosticFactories.luaBundleEntryIsRequired());
    }

    if (options.luaBundle && options.luaLibImport === LuaLibImportKind.Inline) {
        diagnostics.push(diagnosticFactories.usingLuaBundleWithInlineMightGenerateDuplicateCode());
    }

    if (options.luaBundle && options.buildMode === BuildMode.Library) {
        diagnostics.push(diagnosticFactories.cannotBundleLibrary());
    }

    if (options.jsx && options.jsx !== JsxEmit.React) {
        diagnostics.push(diagnosticFactories.unsupportedJsxEmit());
    }

    return diagnostics;
}
