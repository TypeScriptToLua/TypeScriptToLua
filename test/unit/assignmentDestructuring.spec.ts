import { LuaLibImportKind, LuaTarget } from "../../src/CompilerOptions";
import * as util from "../util";

const assignmentDestruturingTs = `
    declare function myFunc(this: void): [number, string];
    let [a, b] = myFunc();`;

test("Assignment destructuring [5.1]", () => {
    const lua = util.transpileString(assignmentDestruturingTs, {
        luaTarget: LuaTarget.Lua51,
        luaLibImport: LuaLibImportKind.None,
    });
    expect(lua).toBe(`local a, b = unpack(myFunc())`);
});

test("Assignment destructuring [5.2]", () => {
    const lua = util.transpileString(assignmentDestruturingTs, {
        luaTarget: LuaTarget.Lua52,
        luaLibImport: LuaLibImportKind.None,
    });
    expect(lua).toBe(`local a, b = table.unpack(myFunc())`);
});

test("Assignment destructuring [JIT]", () => {
    const lua = util.transpileString(assignmentDestruturingTs, {
        luaTarget: LuaTarget.LuaJIT,
        luaLibImport: LuaLibImportKind.None,
    });
    expect(lua).toBe(`local a, b = unpack(myFunc())`);
});

test.each([
    "function foo(): [] { return []; }; let [] = foo();",
    "let [] = ['a', 'b', 'c'];",
    "let [] = [];",
    "let [] = [] = [];",
    "function foo(): [] { return []; }; [] = foo();",
    "[] = ['a', 'b', 'c'];",
    "[] = [];",
    "[] = [] = [];",
])("Empty destructuring (%p)", code => {
    expect(() => util.transpileAndExecute(code)).not.toThrow();
});

test("Union destructuring", () => {
    const code = `
        function foo(): [string] | [] { return ["bar"]; }
        let x: string;
        [x] = foo();
        return x;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});
