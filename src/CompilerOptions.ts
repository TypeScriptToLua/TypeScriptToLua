import * as ts from "typescript";

export interface CompilerOptions extends ts.CompilerOptions {
    addHeader?: boolean;
    luaTarget?: string;
    luaLibImport?: string;
}
