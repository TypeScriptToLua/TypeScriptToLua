import * as util from "../../util";

test("@vararg", () => {
    util.testFunction`
        /** @vararg */
        type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        function foo(a: unknown, ...b: LuaVarArg<unknown[]>) {
            const c = [...b];
            return c.join("");
        }
        function bar(a: unknown, ...b: LuaVarArg<unknown[]>) {
            return foo(a, ...b);
        }
        return bar("A", "B", "C", "D");
    `
        .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toMatch("b = "))
        .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toMatch("unpack"))
        .expectToMatchJsResult();
});

test("@vararg array access", () => {
    util.testFunction`
        /** @vararg */
        type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        function foo(a: unknown, ...b: LuaVarArg<unknown[]>) {
            const c = [...b];
            return c.join("") + b[0];
        }
        return foo("A", "B", "C", "D");
    `.expectToMatchJsResult();
});

test("@vararg global", () => {
    const code = `
        /** @vararg */
        type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        declare const arg: LuaVarArg<string[]>;
        const arr = [...arg];
        const result = arr.join("");
    `;

    const luaBody = util.transpileString(code, undefined, false);
    expect(luaBody).not.toMatch("unpack");

    const lua = `
        function test(...)
            ${luaBody}
            return result
        end
        return test("A", "B", "C", "D")
    `;

    expect(util.executeLua(lua)).toBe("ABCD");
});
