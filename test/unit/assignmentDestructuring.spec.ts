import * as tstl from "../../src";
import * as util from "../util";

const assignmentDestructuringCode = `
    declare function myFunc(this: void): [number, string];
    let [a, b] = myFunc();
`;

test("Assignment destructuring [5.1]", () => {
    util.testModule(assignmentDestructuringCode)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua51, luaLibImport: tstl.LuaLibImportKind.None })
        .expectLuaToMatchSnapshot();
});

test("Assignment destructuring [5.2]", () => {
    util.testModule(assignmentDestructuringCode)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua52, luaLibImport: tstl.LuaLibImportKind.None })
        .expectLuaToMatchSnapshot();
});

test("Assignment destructuring [JIT]", () => {
    util.testModule(assignmentDestructuringCode)
        .setOptions({ luaTarget: tstl.LuaTarget.LuaJIT, luaLibImport: tstl.LuaLibImportKind.None })
        .expectLuaToMatchSnapshot();
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
    util.testFunction(code).expectNoExecutionError();
});

test("Union destructuring", () => {
    util.testFunction`
        function foo(): [string] | [] { return ["bar"]; }
        let x: string;
        [x] = foo();
        return x;
    `.expectToMatchJsResult();
});
