import * as path from "path";
import * as ts from "typescript";

import { Expect } from "alsatian";

import { transpileString as compilerTranspileString, createStringCompilerProgram } from "../../src/Compiler";
import { CompilerOptions, LuaTarget, LuaLibImportKind } from "../../src/CompilerOptions";

import {lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";

import * as fs from "fs";
import { LuaTransformer } from "../../src/LuaTransformer";

export function transpileString(
    str: string,
    options?: CompilerOptions,
    ignoreDiagnostics = true,
    filePath = "file.ts"): string {
    if (options) {
        if (options.noHeader === undefined) {
            options.noHeader = true;
        }
        return compilerTranspileString(str, options, ignoreDiagnostics, filePath);
    } else {
        return compilerTranspileString(
            str,
            {
                luaLibImport: LuaLibImportKind.Require,
                luaTarget: LuaTarget.Lua53,
                target: ts.ScriptTarget.ES2015,
                noHeader: true,
            },
            ignoreDiagnostics,
            filePath
        );
    }
}

export function executeLua(luaStr: string, withLib = true): any {
    if (withLib) {
        luaStr = minimalTestLib + luaStr;
    }

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    const status = lauxlib.luaL_dostring(L, to_luastring(luaStr));

    if (status === lua.LUA_OK) {
        // Read the return value from stack depending on its type.
        if (lua.lua_isboolean(L, -1)) {
            return lua.lua_toboolean(L, -1);
        } else if (lua.lua_isnil(L, -1)) {
            return undefined;
        } else if (lua.lua_isnumber(L, -1)) {
            return lua.lua_tonumber(L, -1);
        } else if (lua.lua_isstring(L, -1)) {
            return lua.lua_tojsstring(L, -1);
        } else {
            throw new Error("Unsupported lua return type: " + to_jsstring(lua.lua_typename(L, lua.lua_type(L, -1))));
        }
    } else {
        // If the lua VM did not terminate with status code LUA_OK an error occurred.
        // Throw a JS error with the message, retrieved by reading a string from the stack.

        // Filter control characters out of string which are in there because ????
        throw new Error("LUA ERROR: " + to_jsstring(lua.lua_tostring(L, -1).filter(c => c >= 20)));
    }
}

export function expectCodeEqual(code1: string, code2: string): void {
    // Trim leading/trailing whitespace
    let c1 = code1.trim();
    let c2 = code2.trim();

    // Unify indentation
    c1 = c1.replace(/\s+/g, " ");
    c2 = c2.replace(/\s+/g, " ");

    Expect(c1).toBe(c2);
}

// Get a mock transformer to use for testing
export function makeTestTransformer(target: LuaTarget = LuaTarget.Lua53): LuaTransformer {
    const options = {luaTarget: target};
    return new LuaTransformer(ts.createProgram([], options), options);
}

export function transpileAndExecute(
    tsStr: string,
    compilerOptions?: CompilerOptions,
    luaHeader?: string,
    tsHeader?: string,
    ignoreDiagnosticsOverride = process.argv[2] === "--ignoreDiagnostics"
): any
{
    const wrappedTsString = `declare function JSONStringify(p: any): string;
        ${tsHeader ? tsHeader : ""}
        function __runTest(): any {${tsStr}}`;

    const lua = `${luaHeader ? luaHeader : ""}
        ${transpileString(wrappedTsString, compilerOptions, ignoreDiagnosticsOverride)}
        return __runTest();`;

    return executeLua(lua);
}

export function transpileExecuteAndReturnExport(
    tsStr: string,
    returnExport: string,
    compilerOptions?: CompilerOptions,
    luaHeader?: string
): any
{
    const wrappedTsString = `declare function JSONStringify(p: any): string;
        ${tsStr}`;

    const lua = `return (function()
        ${luaHeader ? luaHeader : ""}
        ${transpileString(wrappedTsString, compilerOptions, false)}
        end)().${returnExport}`;

    return executeLua(lua);
}

export function parseTypeScript(typescript: string, target: LuaTarget = LuaTarget.Lua53)
    : [ts.SourceFile, ts.TypeChecker] {
    const program = createStringCompilerProgram(typescript, { luaTarget: target });
    return [program.getSourceFile("file.ts"), program.getTypeChecker()];
}

export function findFirstChild(node: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node | undefined {
    for (const child of node.getChildren()) {
        if (predicate(child)) {
            return child;
        }

        const childChild = findFirstChild(child, predicate);
        if (childChild !== undefined) {
            return childChild;
        }
    }
    return undefined;
}

const jsonlib = fs.readFileSync("test/src/json.lua") + "\n";

export const minimalTestLib = jsonlib;
