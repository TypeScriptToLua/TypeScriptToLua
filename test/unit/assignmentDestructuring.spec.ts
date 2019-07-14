import * as tstl from "../../src";
import * as util from "../util";

util.testEachVersion(
    "Assignment destructuring",
    () =>
        util.testModule`
            declare function myFunc(this: void): [number, string];
            let [a, b] = myFunc();
        `
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.None })
            .expectLuaToMatchSnapshot(),
    {
        [tstl.LuaTarget.LuaJIT]: builder => builder,
        [tstl.LuaTarget.Lua51]: builder => builder,
        [tstl.LuaTarget.Lua52]: builder => builder,
        [tstl.LuaTarget.Lua53]: false,
    }
);

test("OmittedExpression in Array Binding Assignment Statement", () => {
    util.testFunction`
        let a, c;
        [a, , c] = [1, 2, 3];
        return { a, c };
    `.expectToMatchJsResult();
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
