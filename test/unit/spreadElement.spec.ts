import * as tstl from "../../src";
import * as util from "../util";

test.each([{ inp: [] }, { inp: [1, 2, 3] }, { inp: [1, "test", 3] }])("Spread Element Push (%p)", ({ inp }) => {
    const result = util.transpileAndExecute(
        `return JSONStringify(([] as Array<string | number>).push(...${JSON.stringify(inp)}));`
    );
    expect(result).toBe(([] as Array<string | number>).push(...inp));
});

test("Spread Element Lua 5.1", () => {
    // Cant test functional because our VM doesn't run on 5.1
    const options: tstl.CompilerOptions = {
        luaTarget: tstl.LuaTarget.Lua51,
        luaLibImport: tstl.LuaLibImportKind.None,
    };
    const lua = util.transpileString(`[].push(...${JSON.stringify([1, 2, 3])});`, options);
    expect(lua).toBe("__TS__ArrayPush({}, unpack({\n    1,\n    2,\n    3,\n}))");
});

test("Spread Element Lua 5.2", () => {
    const options: tstl.CompilerOptions = {
        luaTarget: tstl.LuaTarget.Lua52,
        luaLibImport: tstl.LuaLibImportKind.None,
    };
    const lua = util.transpileString(`[...[0, 1, 2]]`, options);
    expect(lua).toBe("local ____ = {table.unpack({\n    0,\n    1,\n    2,\n})}");
});

test("Spread Element Lua 5.3", () => {
    const options: tstl.CompilerOptions = {
        luaTarget: tstl.LuaTarget.Lua53,
        luaLibImport: tstl.LuaLibImportKind.None,
    };
    const lua = util.transpileString(`[...[0, 1, 2]]`, options);
    expect(lua).toBe("local ____ = {table.unpack({\n    0,\n    1,\n    2,\n})}");
});

test("Spread Element Lua JIT", () => {
    const options: tstl.CompilerOptions = {
        luaTarget: tstl.LuaTarget.LuaJIT,
        luaLibImport: tstl.LuaLibImportKind.None,
    };
    const lua = util.transpileString(`[...[0, 1, 2]]`, options);
    expect(lua).toBe("local ____ = {unpack({\n    0,\n    1,\n    2,\n})}");
});

test("Spread Element Iterable", () => {
    const code = `
        const it = {
            i: -1,
            [Symbol.iterator]() {
                return this;
            },
            next() {
                ++this.i;
                return {
                    value: 2 ** this.i,
                    done: this.i == 9,
                }
            }
        };
        const arr = [...it];
        return JSONStringify(arr)`;
    expect(JSON.parse(util.transpileAndExecute(code))).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256]);
});
