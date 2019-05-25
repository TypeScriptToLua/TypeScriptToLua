import * as ts from "typescript";

type KnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U }
    ? U
    : never;

type OmitIndexSignature<T extends Record<any, any>> = Pick<T, KnownKeys<T>>;

export interface TransformerImport {
    transform: string;
    import?: string;
    after?: boolean;
    afterDeclarations?: boolean;
    type?: 'program' | 'config' | 'checker' | 'raw' | 'compilerOptions';
    [option: string]: any;
}

export type CompilerOptions = OmitIndexSignature<ts.CompilerOptions> & {
    noHeader?: boolean;
    luaTarget?: LuaTarget;
    luaLibImport?: LuaLibImportKind;
    noHoisting?: boolean;
    sourceMapTraceback?: boolean;
    plugins?: Array<ts.PluginImport | TransformerImport>;
    [option: string]: ts.CompilerOptions[string] | Array<ts.PluginImport | TransformerImport>;
};

export enum LuaLibImportKind {
    None = "none",
    Always = "always",
    Inline = "inline",
    Require = "require",
}

export enum LuaTarget {
    Lua51 = "5.1",
    Lua52 = "5.2",
    Lua53 = "5.3",
    LuaJIT = "JIT",
}
