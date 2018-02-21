import * as ts from "typescript";
import { LuaTranspiler, TranspileError } from "../../dist/Transpiler";

const LuaVM = require("lua.vm.js");
const fs = require("fs");

export namespace dummyTypes {
    export const None = {};
    export const Array = { flags: ts.TypeFlags.Object, symbol: { escapedName: "Array" } };
    export const Object = { flags: ts.TypeFlags.Object, symbol: { escapedName: "Object" } };
    export const Number = { flags: ts.TypeFlags.Number, symbol: { escapedName: "Number" } };
}

export function transpileString(str: string, dummyType: any = dummyTypes.None): string {
    const dummyChecker = { getTypeAtLocation: function() { return dummyType; } }
    const file = ts.createSourceFile("____internal_test_file.tstl", str, ts.ScriptTarget.Latest);
    const options: ts.CompilerOptions = { dontRequireLualib: true };
    const result = LuaTranspiler.transpileSourceFile(file, dummyChecker, options);
    return result.trim();
}

export function executeLua(lua: string, withLib = true): any {
    if (withLib) {
        lua = minimalTestLib + lua
    }
    const luavm = new LuaVM.Lua.State();
    return luavm.execute(lua)[0];
}

const lualib = fs.readFileSync("dist/lualib/typescript.lua") + "\n";

const jsonlib = fs.readFileSync("test/src/json.lua") + "\n";

export const minimalTestLib = lualib + jsonlib
