import * as ts from "typescript";

type KnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U }
    ? U
    : never;

type OmitIndexSignature<T extends Record<any, any>> = Pick<T, KnownKeys<T>>;

export interface TransformerConfig {
    transform: string;
    when?: keyof ts.CustomTransformers;
    [option: string]: any;
}

export type CompilerOptions = OmitIndexSignature<ts.CompilerOptions> & {
    noHeader?: boolean;
    luaTarget?: LuaTarget;
    luaLibImport?: LuaLibImportKind;
    noHoisting?: boolean;
    sourceMapTraceback?: boolean;
    tsTransformers?: TransformerConfig[];
    [option: string]: ts.CompilerOptions[string] | TransformerConfig[];
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
    LuaJIT = "jit",
}
