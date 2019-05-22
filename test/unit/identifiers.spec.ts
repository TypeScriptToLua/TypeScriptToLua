import * as util from "../util";

test.each(["$$$", "ɥɣɎɌͼƛಠ", "_̀ः٠‿"])("invalid lua identifier name (%p)", name => {
    const code = `
        const ${name} = "foobar";
        return ${name};`;

    expect(util.transpileAndExecute(code)).toBe("foobar");
});

describe("lua keyword as identifier doesn't interfere with lua's value", () => {
    test("variable (nil)", () => {
        const code = `
            const nil = "foobar";
            return \`\${undefined}|\${nil}\``;

        expect(util.transpileAndExecute(code)).toBe("nil|foobar");
    });

    test("variable (and)", () => {
        const code = `
            const and = "foobar";
            return true && and;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (elseif)", () => {
        const code = `
            const elseif = "foobar";
            if (false) {
            } else if (elseif) {
                return elseif;
            }`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (end)", () => {
        const code = `
            const end = "foobar";
            {
                return end;
            }`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (local)", () => {
        const code = `
            const local = "foobar";
            return local;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (not)", () => {
        const code = `
            const not = "foobar";
            return (!false) && not;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (or)", () => {
        const code = `
            const or = "foobar";
            return false || or;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (repeat)", () => {
        const code = `
            const repeat = "foobar";
            do {} while (false);
            return repeat;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (then)", () => {
        const code = `
            const then = "foobar";
            if (then) {
                return then;
            }`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (until)", () => {
        const code = `
            const until = "foobar";
            do {} while (false);
            return until;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (goto)", () => {
        const code = `
            const goto = "foobar";
            switch (goto) {
                case goto:
                    return goto;
            }`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (print)", () => {
        const luaHeader = `
            local result = ""
            print = function(s)
                result = result .. s
            end`;

        const tsHeader = `
            declare let result: string;`;

        const code = `
            const print = "foobar";
            console.log(print);
            return result;`;

        const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

        expect(util.transpileAndExecute(code, compilerOptions, luaHeader, tsHeader)).toBe("foobar");
    });

    test("variable (type)", () => {
        const code = `
            function type(this: void, a: unknown) {
                return (typeof a) + "|foobar";
            }
            return type(7);`;

        expect(util.transpileAndExecute(code)).toBe("number|foobar");
    });

    test("variable (error)", () => {
        const code = `
            const error = "foobar";
            throw error;`;

        expect(() => util.transpileAndExecute(code)).toThrow(/^LUA ERROR: .+ foobar$/);
    });

    test("variable (assert)", () => {
        const code = `
            const assert = false;
            console.assert(assert, "foobar");`;

        const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

        expect(() => util.transpileAndExecute(code, compilerOptions)).toThrow(
            /^LUA ERROR: .+ foobar$/,
        );
    });

    test("variable (debug)", () => {
        const luaHeader = `
            local result = ""
            print = function(s)
                result = result .. s
            end`;

        const tsHeader = `
            declare let result: string;`;

        const code = `
            const debug = "foobar";
            console.trace(debug);
            return result;`;

        const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

        expect(util.transpileAndExecute(code, compilerOptions, luaHeader, tsHeader)).toMatch(
            /^foobar\nstack traceback.+/,
        );
    });

    test("variable (string)", () => {
        const code = `
            const string = "foobar";
            return string[0];`;

        expect(util.transpileAndExecute(code)).toBe("f");
    });

    test("variable (math)", () => {
        const code = `
            const math = -17;
            return Math.abs(math);`;

        expect(util.transpileAndExecute(code)).toBe(17);
    });

    test("variable (table)", () => {
        const code = `
            const table = ["foobar"];
            return table.pop();`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (coroutine)", () => {
        const code = `
            const coroutine = "foobar";
            function *foo() { yield coroutine; }
            return foo().next().value;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (pairs)", () => {
        const code = `
            const pairs = {foobar: "foobar"};
            let result = "";
            for (const key in pairs) {
                result += key;
            }
            return result;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (pcall)", () => {
        const code = `
            const pcall = "foobar";
            try {} finally {}
            return pcall;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (rawget)", () => {
        const code = `
            const rawget = {foobar: "foobar"};
            return rawget.hasOwnProperty("foobar");`;

        expect(util.transpileAndExecute(code)).toBe(true);
    });

    test("variable (rawset)", () => {
        const code = `
            const rawset = "foobar";
            class A {
                prop = "prop";
            }
            class B extends A {
                get prop() { return rawset; }
            }
            const b = new B();
            return b.prop;`;

        expect(util.transpileAndExecute(code)).toBe("foobar");
    });

    test("variable (require)", () => {
        const code = `
            const require = "foobar";
            export { foo } from "someModule";
            export const result = require;`;

        const lua = `
            package.loaded.someModule = {foo = "bar"}
            return (function()
                ${util.transpileString(code, undefined, true)}
            end)().result`;

        expect(util.executeLua(lua)).toBe("foobar");
    });

    test("variable (tostring)", () => {
        const code = `
            const tostring = 17;
            return tostring.toString();`;

        expect(util.transpileAndExecute(code)).toBe(17);
    });

    test("variable (unpack)", () => {
        const code = `
            const unpack = ["foo", "bar"];
            const [foo, bar] = unpack;`;

        const lua = `
            unpack = table.unpack
            ${util.transpileString(code, undefined, false)}
            return foo .. bar`;

        expect(util.executeLua(lua)).toBe("foobar");
    });

    test("variable (_G)", () => {
        const tsHeader = `
            var foobar = "foo";`;

        const code = `
            const _G = "bar";
            function foo(this: any) {
                return this.foobar + _G;
            }
            return foo();`;

        expect(util.transpileAndExecute(code, undefined, undefined, tsHeader)).toBe("foobar");
    });

    test("function parameter", () => {
        const code = `
            function foo(type: unknown) {
                return \`\${typeof type}|\${type}\`;
            }
            return foo("foobar");`;

        expect(util.transpileAndExecute(code)).toBe("string|foobar");
    });

    test("destructured property function parameter", () => {
        const code = `
            function foo({type}: any) {
                return \`\${typeof type}|\${type}\`;
            }
            return foo({type: "foobar"});`;

        expect(util.transpileAndExecute(code)).toBe("string|foobar");
    });

    test("destructured array element function parameter", () => {
        const code = `
            function foo([type]: any) {
                return \`\${typeof type}|\${type}\`;
            }
            return foo(["foobar"]);`;

        expect(util.transpileAndExecute(code)).toBe("string|foobar");
    });

    test("property", () => {
        const code = `
            const type = "foobar";
            const foo = { type: type };
            return type + "|" + foo.type + "|" + typeof type;`;

        expect(util.transpileAndExecute(code)).toBe("foobar|foobar|string");
    });

    test("shorthand property", () => {
        const code = `
            const type = "foobar";
            const foo = { type };
            return type + "|" + foo.type + "|" + typeof type;`;

        expect(util.transpileAndExecute(code)).toBe("foobar|foobar|string");
    });

    test("destructured property", () => {
        const code = `
            const foo = { type: "foobar" };
            const { type: type } = foo;
            return type + "|" + foo.type + "|" + typeof type;`;

        expect(util.transpileAndExecute(code)).toBe("foobar|foobar|string");
    });

    test("destructured shorthand property", () => {
        const code = `
            const foo = { type: "foobar" };
            const { type } = foo;
            return type + "|" + foo.type + "|" + typeof type;`;

        expect(util.transpileAndExecute(code)).toBe("foobar|foobar|string");
    });

    test("destructured array element", () => {
        const code = `
            const foo = ["foobar"];
            const [type] = foo;
            return type + "|" + typeof type;`;

        expect(util.transpileAndExecute(code)).toBe("foobar|string");
    });

    test.each(["type", "type as type"])("imported variable (%p)", importName => {
        const luaHeader = `
                package.loaded.someModule = {type = "foobar"}`;

        const code = `
            import {${importName}} from "someModule";
            export const result = typeof 7 + "|" + type;
        `;

        const lua = util.transpileString(code);
        const result = util.executeLua(`${luaHeader} return (function() ${lua} end)().result`);

        expect(result).toBe("number|foobar");
    });

    test.each([
        { returnExport: "type", expectResult: "foobar" },
        { returnExport: "mytype", expectResult: "foobar" },
        { returnExport: "result", expectResult: "string|foobar" },
    ])("separately exported variable (%p)", ({ returnExport, expectResult }) => {
        const code = `
            const type = "foobar";
            export { type }
            export { type as mytype }
            export const result = typeof type + "|" + type;`;

        expect(util.transpileExecuteAndReturnExport(code, returnExport)).toBe(expectResult);
    });

    test.each(["type", "type as type"])(
        "re-exported variable with lua keyword as name (%p)",
        importName => {
            const code = `
                export { ${importName} } from "someModule"`;

            const lua = `
                package.loaded.someModule = {type = "foobar"}
                return (function()
                    ${util.transpileString(code)}
                end)().type`;

            expect(util.executeLua(lua)).toBe("foobar");
        },
    );

    test("class", () => {
        const code = `
            class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            const t = new type();
            return t.method() + "|" + type.staticMethod();`;

        expect(util.transpileAndExecute(code)).toBe("number|string");
    });

    test("subclass of class", () => {
        const code = `
            class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            class Foo extends type {}
            const foo = new Foo();
            return foo.method() + "|" + Foo.staticMethod();`;

        expect(util.transpileAndExecute(code)).toBe("number|string");
    });

    test.each([
        { returnExport: "result", expectResult: "number|string" },
        { returnExport: "type ~= nil", expectResult: true },
    ])("exported class (%p)", ({ returnExport, expectResult }) => {
        const code = `
            export class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            const t = new type();
            export const result = t.method() + "|" + type.staticMethod();`;

        expect(util.transpileExecuteAndReturnExport(code, returnExport)).toBe(expectResult);
    });

    test.each([
        { returnExport: "result", expectResult: "number|string" },
        { returnExport: "type ~= nil", expectResult: true },
    ])("subclass of exported class (%p)", ({ returnExport, expectResult }) => {
        const code = `
            export class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            class Foo extends type {}
            const foo = new Foo();
            export const result = foo.method() + "|" + Foo.staticMethod();`;

        expect(util.transpileExecuteAndReturnExport(code, returnExport)).toBe(expectResult);
    });

    test("namespace", () => {
        const tsHeader = `
            namespace type {
                export const foo = "foobar";
            }`;

        const code = `
            return typeof type.foo + "|" + type.foo`;

        expect(util.transpileAndExecute(code, undefined, undefined, tsHeader)).toBe(
            "string|foobar",
        );
    });

    test.each([
        { returnExport: "result", expectResult: "string|foobar" },
        { returnExport: "type ~= nil", expectResult: true },
    ])("exported namespace (%p)", ({ returnExport, expectResult }) => {
        const code = `
            export namespace type {
                export const foo = "foobar";
            }
            export const result = typeof type.foo + "|" + type.foo;`;

        expect(util.transpileExecuteAndReturnExport(code, returnExport)).toBe(expectResult);
    });

    test("merged namespace", () => {
        const tsHeader = `
            class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof true; }
            }

            namespace type {
                export const foo = "foo";
            }

            namespace type {
                export const bar = "bar";
            }`;

        const code = `
            const t = new type();
            return \`\${t.method()}|\${type.staticMethod()}|\${typeof type.foo}|\${type.foo}|\${type.bar}\`;`;

        expect(util.transpileAndExecute(code, undefined, undefined, tsHeader)).toBe(
            "number|boolean|string|foo|bar",
        );
    });

    test.each([
        { returnExport: "result", expectResult: "number|boolean|string|foo|bar" },
        { returnExport: "type ~= nil", expectResult: true },
    ])("exported merged namespace (%p)", ({ returnExport, expectResult }) => {
        const code = `
            export class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof true; }
            }

            export namespace type {
                export const foo = "foo";
            }

            export namespace type {
                export const bar = "bar";
            }

            const t = new type();
            export const result = \`\${t.method()}|\${type.staticMethod()}|\${typeof type.foo}|\${type.foo}|\${type.bar}\`;`;

        expect(util.transpileExecuteAndReturnExport(code, returnExport)).toBe(expectResult);
    });
});

test("declaration-only variable with lua keyword as name is not renamed", () => {
    const code = `
        declare function type(this: void, a: unknown): string;
        type(7);`;

    expect(util.transpileString(code, undefined, false)).toBe("type(7)");
});

test("exported variable with lua keyword as name is not renamed", () => {
    const code = `
        export const print = "foobar";`;

    expect(util.transpileExecuteAndReturnExport(code, "print")).toBe("foobar");
});
