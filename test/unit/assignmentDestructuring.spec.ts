import * as tstl from "../../src";
import * as util from "../util";

const assignmentDestruturingTs = `
    declare function myFunc(this: void): [number, string];
    let [a, b] = myFunc();`;

test("Assignment destructuring [5.1]", () => {
    const lua = util.transpileString(assignmentDestruturingTs, {
        luaTarget: tstl.LuaTarget.Lua51,
        luaLibImport: tstl.LuaLibImportKind.None,
    });
    expect(lua).toBe(`local a, b = unpack(\n    myFunc()\n)`);
});

test("Assignment destructuring [5.2]", () => {
    const lua = util.transpileString(assignmentDestruturingTs, {
        luaTarget: tstl.LuaTarget.Lua52,
        luaLibImport: tstl.LuaLibImportKind.None,
    });
    expect(lua).toBe(`local a, b = table.unpack(\n    myFunc()\n)`);
});

test("Assignment destructuring [JIT]", () => {
    const lua = util.transpileString(assignmentDestruturingTs, {
        luaTarget: tstl.LuaTarget.LuaJIT,
        luaLibImport: tstl.LuaLibImportKind.None,
    });
    expect(lua).toBe(`local a, b = unpack(\n    myFunc()\n)`);
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
