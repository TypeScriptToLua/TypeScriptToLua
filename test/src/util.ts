import * as ts from "typescript";
import { LuaTranspiler, TranspileError } from "../../dist/Transpiler";

const LuaVM = require("lua.vm.js");
const fs = require("fs");

export namespace dummyTypes {
    export const Array = { flags: ts.TypeFlags.Object, symbol: { escapedName: "Array" } };
    export const Object = { flags: ts.TypeFlags.Object, symbol: { escapedName: "Object" } }
}

export function transpileString(str: string, dummyType: any): string {
    const dummyChecker = { getTypeAtLocation: function() { return dummyType; } }
    const file = ts.createSourceFile("", str, ts.ScriptTarget.Latest);
    const result = LuaTranspiler.transpileSourceFile(file, dummyChecker, false);
    return result.trim();
}

export function executeLua(lua: string, withLib = true): string {
    if (withLib) {
        lua = minimalTestLib + lua
    }
    const luavm = new LuaVM.Lua.State();
    return luavm.execute(lua)[0];
}

const lualib = fs.readFileSync("dist/lualib/typescript.lua") + "\n";

const arrayToStringDef = `
function ArrayToString(list)
    local result = ""
    for i=1,#list do result = result .. list[i]
        if i < #list then
            result = result .. ','
        end
    end
    return result
end
`

const jsonStringifyDef = `
function JSONStringify(t, isTable)
    local result = '{'

    local empty = true

    for k, v in pairs(t) do
        empty = false
        if type(v) == 'table' then
            if (v ~= t) then
                result = result .. '"' .. tostring(k) .. '":'
                result = result .. JSONStringify(v)
                result = result .. ','
            end
        elseif type(v) ~= 'function' then
            result = result .. '"' .. tostring(k) .. '":' .. tostring(v) .. ','
        end
    end

    if empty then
      return '{}'
    else
      return result:sub(1, -2) .. '}'
    end
end
`

export const minimalTestLib = lualib + arrayToStringDef + jsonStringifyDef
