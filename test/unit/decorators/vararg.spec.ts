import * as util from "../../util";

test.each([{}, { noHoisting: true }])("@vararg", compilerOptions => {
    const code = `
        /** @vararg */ type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        function foo(a: unknown, ...b: LuaVarArg<unknown[]>) {
            const c = [...b];
            return c.join("");
        }
        function bar(a: unknown, ...b: LuaVarArg<unknown[]>) {
            return foo(a, ...b);
        }
        return bar("A", "B", "C", "D");
    `;

    const lua = util.transpileString(code, compilerOptions);
    expect(lua).not.toMatch("b = ({...})");
    expect(lua).not.toMatch("unpack");
    expect(util.transpileAndExecute(code, compilerOptions)).toBe("BCD");
});

test.each([{}, { noHoisting: true }])("@vararg array access", compilerOptions => {
    const code = `
        /** @vararg */ type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        function foo(a: unknown, ...b: LuaVarArg<unknown[]>) {
            const c = [...b];
            return c.join("") + b[0];
        }
        return foo("A", "B", "C", "D");
    `;

    expect(util.transpileAndExecute(code, compilerOptions)).toBe("BCDB");
});

test.each([{}, { noHoisting: true }])("@vararg global", compilerOptions => {
    const code = `
        /** @vararg */ type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        declare const arg: LuaVarArg<string[]>;
        const arr = [...arg];
        const result = arr.join("");
    `;

    const luaBody = util.transpileString(code, compilerOptions, false);
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
