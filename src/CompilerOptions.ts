import * as ts from "typescript";
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

export type CompilerOptions = OmitIndexSignature<ts.CompilerOptions> & {
    buildMode?: BuildMode;
    noImplicitSelf?: boolean;
    noHeader?: boolean;
    luaBundle?: string;
    luaBundleEntry?: string;
    luaTarget?: LuaTarget;
    luaLibImport?: LuaLibImportKind;
    sourceMapTraceback?: boolean;
    luaPlugins?: LuaPluginImport[];
    plugins?: Array<ts.PluginImport | TransformerImport>;
    tstlVerbose?: boolean;
    [option: string]: any;
};

export enum LuaLibImportKind {
    None = "none",
    Always = "always",
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

    return diagnostics;
}
