import * as util from "../../util";

const varargDeclaration = `
    /** @vararg */
    type LuaVararg<A extends unknown[]> = A & { __luaVararg?: never };
`;

test("@vararg", () => {
    util.testFunction`
        ${varargDeclaration}
        function foo(a: unknown, ...b: LuaVararg<unknown[]>) {
            const c = [...b];
            return c.join("");
        }
        function bar(a: unknown, ...b: LuaVararg<unknown[]>) {
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
        ${varargDeclaration}
        function foo(a: unknown, ...b: LuaVararg<unknown[]>) {
            const c = [...b];
            return c.join("") + b[0];
        }
        return foo("A", "B", "C", "D");
    `.expectToMatchJsResult();
});

test("@vararg global", () => {
    util.testModule`
        ${varargDeclaration}
        declare const arg: LuaVararg<string[]>;
        export const result = [...arg].join("");
    `
        .setLuaFactory(code => `return (function(...) ${code} end)("A", "B", "C", "D")`)
        .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toMatch("unpack"))
        .expectToEqual({ result: "ABCD" });
});
