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

export function transpileString(str: string, dummyType: any): string {
    const dummyChecker = { getTypeAtLocation: function() { return dummyType; } }
    const file = ts.createSourceFile("temp.ts", str, ts.ScriptTarget.Latest);
    const result = LuaTranspiler.transpileSourceFile(file, dummyChecker, false);
    return result.trim();
}

export function transpileFile(path: string): string {
    const program = ts.createProgram([path], {});
    const checker = program.getTypeChecker();

    // Output errors
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diag => diag.code != 6054);
    diagnostics.forEach(diagnostic => console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`));

    const lua = LuaTranspiler.transpileSourceFile(program.getSourceFile(path), checker, true);
    return lua.trim();
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
