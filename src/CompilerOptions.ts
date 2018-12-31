import * as ts from "typescript";

export interface CompilerOptions extends ts.CompilerOptions {
    addHeader?: boolean;
    luaTarget?: string;
    luaLibImport?: string;
}

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