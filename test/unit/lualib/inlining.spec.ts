import { LuaLibImportKind, LuaTarget } from "../../../src";
import * as util from "../../util";

test("map constructor", () => {
    const result = util.transpileAndExecute(`let mymap = new Map(); return mymap.size;`, {
        luaLibImport: LuaLibImportKind.Inline,
        luaTarget: LuaTarget.Lua53,
    });

    expect(result).toBe(0);
});

test("map foreach keys", () => {
    const result = util.transpileAndExecute(
        `let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
        let count = 0;
        mymap.forEach((value, key) => { count += key; });
        return count;`,
        { luaLibImport: LuaLibImportKind.Inline }
    );

    expect(result).toBe(18);
});

test("set constructor", () => {
    const result = util.transpileAndExecute(
        `class abc {} let def = new abc(); let myset = new Set(); return myset.size;`,
        { luaLibImport: LuaLibImportKind.Inline }
    );

    expect(result).toBe(0);
});

test("set foreach keys", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set([2, 3, 4]);
        let count = 0;
        myset.forEach((value, key) => { count += key; });
        return count;`,
        { luaLibImport: LuaLibImportKind.Inline }
    );

    expect(result).toBe(9);
});
