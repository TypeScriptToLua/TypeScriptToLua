import * as ts from "typescript";
import * as diagnosticFactories from "./transpilation/diagnostics";

type KnownKeys<T> = { [K in keyof T]: string extends K ? never : number extends K ? never : K } extends {
    [K in keyof T]: infer U;
}
    ? U
    : never;

type OmitIndexSignature<T extends Record<any, any>> = Pick<T, KnownKeys<T>>;

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
    noImplicitSelf?: boolean;
    noHeader?: boolean;
    luaBundle?: string;
    luaBundleEntry?: string;
    luaTarget?: LuaTarget;
    luaLibImport?: LuaLibImportKind;
    sourceMapTraceback?: boolean;
    luaPlugins?: LuaPluginImport[];
    plugins?: Array<ts.PluginImport | TransformerImport>;
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
    LuaJIT = "JIT",
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

    return diagnostics;
}
