import * as path from "path";
import * as ts from "typescript";

import { Expect } from "alsatian";

import { CompilerOptions } from "../../src/CommandLineParser";
import { createTranspiler } from "../../src/Compiler";
import { LuaTarget, LuaTranspiler, TranspileError } from "../../src/Transpiler";

import {lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";

const fs = require("fs");

const libSource = fs.readFileSync(path.join(path.dirname(require.resolve("typescript")), "lib.es6.d.ts")).toString();

export function transpileString(str: string, options: CompilerOptions = { luaLibImport: "none", luaTarget: LuaTarget.Lua53 }): string {
    const compilerHost = {
        directoryExists: () => true,
        fileExists: (fileName): boolean => true,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: () => "lib.es6.d.ts",
        getDirectories: () => [],
        getNewLine: () => "\n",

        getSourceFile: (filename, languageVersion) => {
            if (filename === "file.ts") {
                return ts.createSourceFile(filename, str, ts.ScriptTarget.Latest, false);
            }
            if (filename === "lib.es6.d.ts") {
                return ts.createSourceFile(filename, libSource, ts.ScriptTarget.Latest, false);
            }
            return undefined;
        },

        readFile: () => "",

        useCaseSensitiveFileNames: () => false,
        // Don't write output
        writeFile: (name, text, writeByteOrderMark) => null,
    };
    const program = ts.createProgram(["file.ts"], options, compilerHost);

    const result = createTranspiler(program.getTypeChecker(),
                                    options,
                                    program.getSourceFile("file.ts")).transpileSourceFile();
    return result.trim();
}

export function transpileFile(filePath: string): string {
    const program = ts.createProgram([filePath], {});
    const checker = program.getTypeChecker();

    // Output errors
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diag => diag.code !== 6054);
    diagnostics.forEach(diagnostic => console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`));

    const options: ts.CompilerOptions = { luaLibImport: "none" };
    const result = createTranspiler(checker, options, program.getSourceFile(filePath)).transpileSourceFile();
    return result.trim();
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
            return null;
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

export function expectCodeEqual(code1: string, code2: string) {
    // Trim leading/trailing whitespace
    let c1 = code1.trim();
    let c2 = code2.trim();

    // Unify indentation
    c1 = c1.replace(/\s+/g, " ");
    c2 = c2.replace(/\s+/g, " ");

    Expect(c1).toBe(c2);
}

// Get a mock transpiler to use for testing
export function makeTestTranspiler(target: LuaTarget = LuaTarget.Lua53) {
    return createTranspiler({} as ts.TypeChecker,
                            { luaLibImport: "none", luaTarget: target } as any,
                            { statements: [] } as any as ts.SourceFile);
}

export function transpileAndExecute(ts: string): any {
    return executeLua(transpileString(ts));
}

const tslualib = fs.readFileSync("dist/lualib/lualib_bundle.lua") + "\n";

const jsonlib = fs.readFileSync("test/src/json.lua") + "\n";

export const minimalTestLib = tslualib + jsonlib;