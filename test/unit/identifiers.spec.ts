import { LuaTarget } from "../../src";
import { invalidAmbientIdentifierName } from "../../src/transformation/utils/diagnostics";
import { luaKeywords } from "../../src/transformation/utils/safe-names";
import * as util from "../util";

const invalidLuaCharNames = ["$$$", "ɥɣɎɌͼƛಠ", "_̀ः٠‿"];
const validTsInvalidLuaKeywordNames = [
    "and",
    "elseif",
    "end",
    "goto",
    "local",
    "nil",
    "not",
    "or",
    "repeat",
    "then",
    "until",
];
const invalidLuaNames = [...invalidLuaCharNames, ...luaKeywords];
const validTsInvalidLuaNames = [...invalidLuaCharNames, ...validTsInvalidLuaKeywordNames];

test.each(validTsInvalidLuaNames)("invalid lua identifier name (%p)", name => {
    util.testFunction`
        const ${name} = "foobar";
        return ${name};
    `.expectToMatchJsResult();
});

test.each([...luaKeywords.values()])("lua keyword as property name (%p)", keyword => {
    util.testFunction`
        const x = { ${keyword}: "foobar" };
        return x.${keyword};
    `.expectToMatchJsResult();
});

test.each(validTsInvalidLuaKeywordNames)("destructuring lua keyword (%p)", keyword => {
    util.testFunction`
        const { foo: ${keyword} } = { foo: "foobar" };
        return ${keyword};
    `.expectToMatchJsResult();
});

test.each(validTsInvalidLuaKeywordNames)("destructuring shorthand lua keyword (%p)", keyword => {
    util.testFunction`
        const { ${keyword} } = { ${keyword}: "foobar" };
        return ${keyword};
    `.expectToMatchJsResult();
});

test.each(invalidLuaNames)("lua keyword or invalid identifier as method call (%p)", name => {
    util.testFunction`
        const foo = {
            ${name}(arg: string) { return "foo" + arg; }
        };
        return foo.${name}("bar");
    `.expectToMatchJsResult();
});

test.each(invalidLuaNames)("lua keyword or invalid identifier as complex method call (%p)", name => {
    util.testFunction`
        const foo = {
            ${name}(arg: string) { return "foo" + arg; }
        };
        function getFoo() { return foo; }
        return getFoo().${name}("bar");
    `.expectToMatchJsResult();
});

test.each([
    "var local: any;",
    "let local: any;",
    "const local: any;",
    "const foo: any, bar: any, local: any;",
    "class local {}",
    "namespace local { export const bar: any; }",
    "module local { export const bar: any; }",
    "enum local {}",
    "function local() {}",
])("ambient identifier cannot be a lua keyword (%p)", statement => {
    util.testModule`
        declare ${statement}
        local;
    `
        .disableSemanticCheck()
        .expectDiagnosticsToMatchSnapshot([invalidAmbientIdentifierName.code]);
});

test.each([
    "var $$$: any;",
    "let $$$: any;",
    "const $$$: any;",
    "const foo: any, bar: any, $$$: any;",
    "class $$$ {}",
    "namespace $$$ { export const bar: any; }",
    "module $$$ { export const bar: any; }",
    "enum $$$ {}",
    "function $$$();",
])("ambient identifier must be a valid lua identifier (%p)", statement => {
    util.testModule`
        declare ${statement}
        $$$;
    `.expectDiagnosticsToMatchSnapshot([invalidAmbientIdentifierName.code]);
});

test.each(validTsInvalidLuaNames)(
    "ambient identifier must be a valid lua identifier (object literal shorthand) (%p)",
    name => {
        util.testModule`
            declare var ${name}: any;
            const foo = { ${name} };
        `.expectDiagnosticsToMatchSnapshot([invalidAmbientIdentifierName.code]);
    }
);

test.each(validTsInvalidLuaNames)("undeclared identifier must be a valid lua identifier (%p)", name => {
    util.testModule`
        const foo = ${name};
    `
        .disableSemanticCheck()
        .expectDiagnosticsToMatchSnapshot([invalidAmbientIdentifierName.code]);
});

test.each(validTsInvalidLuaNames)(
    "undeclared identifier must be a valid lua identifier (object literal shorthand) (%p)",
    name => {
        util.testModule`
            const foo = { ${name} };
        `
            .disableSemanticCheck()
            .expectDiagnosticsToMatchSnapshot([invalidAmbientIdentifierName.code]);
    }
);

test.each(validTsInvalidLuaNames)("exported values with invalid lua identifier names (%p)", name => {
    const testBuilder = util.testModule(`export const ${name} = "foobar";`);
    const lua = testBuilder.getMainLuaCodeChunk();
    const luaResult = testBuilder.getLuaExecutionResult();
    expect(lua.indexOf(`"${name}"`)).toBeGreaterThanOrEqual(0);
    expect(luaResult[name]).toBe("foobar");
});

test("exported identifiers referenced in namespace (%p)", () => {
    util.testModule`
        export const foo = "foobar";
        namespace NS {
            export const bar = foo;
        }
        export const baz = NS.bar;
    `.expectToMatchJsResult();
});

test("exported namespace identifiers referenced in different namespace (%p)", () => {
    const tsHeader = `
        namespace A {
            export const foo = "foobar";
            namespace B {
                export const bar = foo;
            }
            export const baz = B.bar;
        }`;
    util.testFunction("return A.baz").setTsHeader(tsHeader).expectToMatchJsResult();
});

test("exported identifiers referenced in nested scope (%p)", () => {
    util.testModule`
        export const foo = "foobar";
        namespace A {
            export namespace B {
                export const bar = foo;
            }
        }
        export const baz = A.B.bar;
    `.expectToMatchJsResult();
});

test.each(validTsInvalidLuaNames)(
    "exported values with invalid lua identifier names referenced in different scope (%p)",
    name => {
        util.testModule`
            export const ${name} = "foobar";
            namespace NS {
                export const foo = ${name};
            }
            export const bar = NS.foo;
        `.expectToMatchJsResult();
    }
);

test.each(validTsInvalidLuaNames)("class with invalid lua name has correct name property", name => {
    util.testFunction`
        class ${name} {}
        return ${name}.name;
    `.expectToMatchJsResult();
});

test.each(validTsInvalidLuaNames)("decorated class with invalid lua name", name => {
    util.testFunction`
        function decorator<T extends new (...args: any[]) => any>(Class: T): T {
            return class extends Class {
                public bar = "foobar";
            };
        }

        @decorator
        class ${name} {}
        return (${name} as any).bar;
    `.expectToMatchJsResult();
});

test.each(validTsInvalidLuaNames)("exported decorated class with invalid lua name", name => {
    util.testModule`
        function decorator<T extends new (...args: any[]) => any>(Class: T): T {
            return class extends Class {
                public bar = "foobar";
            };
        }

        @decorator
        export class ${name} {}
    `
        .setReturnExport(name, "bar")
        .expectToMatchJsResult();
});

describe("unicode identifiers in supporting environments (luajit)", () => {
    const unicodeNames = ["𝛼𝛽𝚫", "ɥɣɎɌͼƛಠ", "_̀ः٠‿"];

    test.each(unicodeNames)("identifier name (%p)", name => {
        util.testFunction`
            const ${name} = "foobar";
            return ${name};
        `
            .setOptions({ luaTarget: LuaTarget.LuaJIT })
            .expectLuaToMatchSnapshot();
    });

    test.each(unicodeNames)("property name (%p)", name => {
        util.testFunction`
            const x = { ${name}: "foobar" };
            return x.${name};
        `
            .setOptions({ luaTarget: LuaTarget.LuaJIT })
            .expectLuaToMatchSnapshot();
    });

    test.each(unicodeNames)("destructuring property name (%p)", name => {
        util.testFunction`
            const { foo: ${name} } = { foo: "foobar" };
            return ${name};
        `
            .setOptions({ luaTarget: LuaTarget.LuaJIT })
            .expectLuaToMatchSnapshot();
    });

    test.each(unicodeNames)("destructuring shorthand (%p)", name => {
        util.testFunction`
            const { ${name} } = { ${name}: "foobar" };
            return ${name};
        `
            .setOptions({ luaTarget: LuaTarget.LuaJIT })
            .expectLuaToMatchSnapshot();
    });

    test.each(unicodeNames)("function (%p)", name => {
        util.testFunction`
            function ${name}(arg: string) {
                return "foo" + arg;
            }
            return ${name}("bar");
        `
            .setOptions({ luaTarget: LuaTarget.LuaJIT })
            .expectLuaToMatchSnapshot();
    });

    test.each(unicodeNames)("method (%p)", name => {
        util.testFunction`
            const foo = {
                ${name}(arg: string) { return "foo" + arg; }
            };
            return foo.${name}("bar");
        `
            .setOptions({ luaTarget: LuaTarget.LuaJIT })
            .expectLuaToMatchSnapshot();
    });
});

describe("lua keyword as identifier doesn't interfere with lua's value", () => {
    test("variable (nil)", () => {
        util.testFunction`
            const nil = "foobar";
            return \`\${undefined}|\${nil}\`
        `.expectToEqual("nil|foobar");
    });

    test("variable (and)", () => {
        util.testFunction`
            const and = "foobar";
            return true && and;
        `.expectToMatchJsResult();
    });

    test("variable (elseif)", () => {
        util.testFunction`
            const elseif = "foobar";
            if (false) {
            } else if (elseif) {
                return elseif;
            }
        `.expectToMatchJsResult();
    });

    test("variable (end)", () => {
        util.testFunction`
            const end = "foobar";
            {
                return end;
            }
        `.expectToMatchJsResult();
    });

    test("variable (local)", () => {
        util.testFunction`
            const local = "foobar";
            return local;
        `.expectToMatchJsResult();
    });

    test("variable (not)", () => {
        util.testFunction`
            const not = "foobar";
            return (!false) && not;
        `.expectToMatchJsResult();
    });

    test("variable (or)", () => {
        util.testFunction`
            const or = "foobar";
            return false || or;
        `.expectToMatchJsResult();
    });

    test("variable (repeat)", () => {
        util.testFunction`
            const repeat = "foobar";
            do {} while (false);
            return repeat;
        `.expectToMatchJsResult();
    });

    test("variable (then)", () => {
        util.testFunction`
            const then = "foobar";
            if (then) {
                return then;
            }
        `.expectToMatchJsResult();
    });

    test("variable (until)", () => {
        util.testFunction`
            const until = "foobar";
            do {} while (false);
            return until;
        `.expectToMatchJsResult();
    });

    test("variable (goto)", () => {
        util.testFunction`
            const goto = "foobar";
            switch (goto) {
                case goto:
                    return goto;
            }
        `.expectToMatchJsResult();
    });

    test("variable (print)", () => {
        const luaHeader = `
            local result = ""
            print = function(s)
                result = result .. s
            end`;

        const tsHeader = `
            declare let result: string;`;

        const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

        util.testFunction`
            const print = "foobar";
            console.log(print);
            return result;
        `
            .setLuaHeader(luaHeader)
            .setTsHeader(tsHeader)
            .setOptions(compilerOptions)
            .expectToEqual("foobar");
    });

    test("variable (type)", () => {
        util.testFunction`
            function type(this: void, a: unknown) {
                return (typeof a) + "|foobar";
            }
            return type(7);
        `.expectToMatchJsResult();
    });

    test("variable (error)", () => {
        const executionResult = util.testFunction`
            const error = "foobar";
            throw error;
        `.getLuaExecutionResult();

        expect(executionResult).toEqual(new util.ExecutionError("foobar"));
    });

    test("variable (assert)", () => {
        const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

        const luaResult = util.testFunction`
            const assert = false;
            console.assert(assert, "foobar");
        `
            .setOptions(compilerOptions)
            .getLuaExecutionResult();

        expect(luaResult).toEqual(new util.ExecutionError("foobar"));
    });

    test("variable (debug)", () => {
        const luaHeader = `
            local result = ""
            print = function(s)
                result = result .. s
            end`;

        const tsHeader = `
            declare let result: string;`;

        const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

        const luaResult = util.testFunction`
            const debug = "foobar";
            console.trace(debug);
            return result;
        `
            .setTsHeader(tsHeader)
            .setLuaHeader(luaHeader)
            .setOptions(compilerOptions)
            .getLuaExecutionResult();

        expect(luaResult).toMatch(/^foobar\nstack traceback.+/);
    });

    test("variable (string)", () => {
        util.testFunction`
            const string = "foobar";
            return string[0];
        `.expectToMatchJsResult();
    });

    test("variable (math)", () => {
        util.testFunction`
            const math = -17;
            return Math.abs(math);
        `.expectToMatchJsResult();
    });

    test("variable (table)", () => {
        util.testFunction`
            const table = ["foobar"];
            return table.pop();
        `.expectToMatchJsResult();
    });

    test("variable (coroutine)", () => {
        util.testFunction`
            const coroutine = "foobar";
            function *foo() { yield coroutine; }
            return foo().next().value;
        `.expectToMatchJsResult();
    });

    test("variable (pairs)", () => {
        util.testFunction`
            const pairs = {foobar: "foobar"};
            let result = "";
            for (const key in pairs) {
                result += key;
            }
            return result;
        `.expectToMatchJsResult();
    });

    test("variable (pcall)", () => {
        util.testFunction`
            const pcall = "foobar";
            try {} finally {}
            return pcall;
        `.expectToMatchJsResult();
    });

    test("variable (rawget)", () => {
        util.testFunction`
            const rawget = {foobar: "foobar"};
            return rawget.hasOwnProperty("foobar");
        `.expectToMatchJsResult();
    });

    test("variable (require)", () => {
        const luaHeader = 'package.loaded.someModule = {foo = "bar"}';

        const luaResult = util.testModule`
            const require = "foobar";
            export { foo } from "someModule";
            export const result = require;
        `
            .setLuaHeader(luaHeader)
            .getLuaExecutionResult();

        expect(luaResult.result).toBe("foobar");
    });

    test("variable (tostring)", () => {
        util.testFunction`
            const tostring = 17;
            return tostring.toString();
        `.expectToMatchJsResult();
    });

    test("variable (unpack)", () => {
        // Can't use expectToMatchJsResult because above is not valid TS/JS
        const luaHeader = "unpack = table.unpack";

        const luaResult = util.testFunction`
            const unpack = ["foo", "bar"];
            const [foo, bar] = unpack;
            return foo + bar;
        `
            .setLuaHeader(luaHeader)
            .getLuaExecutionResult();

        expect(luaResult).toBe("foobar");
    });

    test("variable (_G)", () => {
        util.testFunction`
            const _G = "bar";
            (globalThis as any).foo = "foo";
            return (globalThis as any).foo + _G;
        `.expectToMatchJsResult();
    });

    test("function parameter", () => {
        util.testFunction`
            function foo(type: unknown) {
                return \`\${typeof type}|\${type}\`;
            }
            return foo("foobar");
        `.expectToMatchJsResult();
    });

    test("destructured property function parameter", () => {
        util.testFunction`
            function foo({type}: any) {
                return \`\${typeof type}|\${type}\`;
            }
            return foo({type: "foobar"});
        `.expectToMatchJsResult();
    });

    test("destructured array element function parameter", () => {
        util.testFunction`
            function foo([type]: any) {
                return \`\${typeof type}|\${type}\`;
            }
            return foo(["foobar"]);
        `.expectToMatchJsResult();
    });

    test("property", () => {
        util.testFunction`
            const type = "foobar";
            const foo = { type: type };
            return type + "|" + foo.type + "|" + typeof type;
        `.expectToMatchJsResult();
    });

    test("shorthand property", () => {
        util.testFunction`
            const type = "foobar";
            const foo = { type };
            return type + "|" + foo.type + "|" + typeof type;
        `.expectToMatchJsResult();
    });

    test("destructured property", () => {
        util.testFunction`
            const foo = { type: "foobar" };
            const { type: type } = foo;
            return type + "|" + foo.type + "|" + typeof type;
        `.expectToMatchJsResult();
    });

    test("destructured shorthand property", () => {
        util.testFunction`
            const foo = { type: "foobar" };
            const { type } = foo;
            return type + "|" + foo.type + "|" + typeof type;
        `.expectToMatchJsResult();
    });

    test("destructured array element", () => {
        util.testFunction`
            const foo = ["foobar"];
            const [type] = foo;
            return type + "|" + typeof type;
        `.expectToMatchJsResult();
    });

    test.each(["type", "type as type"])("imported variable (%p)", importName => {
        // Can't use expectToMatchJsResult because above is not valid TS/JS
        const luaHeader = 'package.loaded.someModule = {type = "foobar"}';

        const luaResult = util.testModule`
            import {${importName}} from "someModule";
            export const result = typeof 7 + "|" + type;
        `
            .setLuaHeader(luaHeader)
            .getLuaExecutionResult();

        expect(luaResult.result).toBe("number|foobar");
    });

    test("separately exported variable (%p)", () => {
        util.testModule`
            const type = "foobar";
            export { type }
            export { type as mytype }
            export const result = typeof type + "|" + type;
        `.expectToMatchJsResult();
    });

    test.each(["type", "type as type"])("re-exported variable with lua keyword as name (%p)", importName => {
        // Can't use expectToMatchJsResult because above is not valid TS/JS

        const luaHeader = 'package.loaded.someModule = {type = "foobar"}';

        const luaResult = util.testModule`
            export { ${importName} } from "someModule";
        `
            .setLuaHeader(luaHeader)
            .getLuaExecutionResult();

        expect(luaResult.type).toBe("foobar");
    });

    test("class", () => {
        util.testFunction`
            class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            const t = new type();
            return t.method() + "|" + type.staticMethod();
        `.expectToMatchJsResult();
    });

    test("subclass of class", () => {
        util.testFunction`
            class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            class Foo extends type {}
            const foo = new Foo();
            return foo.method() + "|" + Foo.staticMethod();
        `.expectToMatchJsResult();
    });

    test.each(["result", "type ~= nil"])("exported class (%p)", returnExport => {
        util.testModule`
            export class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            const t = new type();
            export const result = t.method() + "|" + type.staticMethod();
        `
            .setReturnExport(returnExport)
            .expectToMatchJsResult();
    });

    test.each(["result", "type ~= nil"])("subclass of exported class (%p)", returnExport => {
        util.testModule`
            export class type {
                method() { return typeof 0; }
                static staticMethod() { return typeof "foo"; }
            }
            class Foo extends type {}
            const foo = new Foo();
            export const result = foo.method() + "|" + Foo.staticMethod();
        `
            .setReturnExport(returnExport)
            .expectToMatchJsResult();
    });

    test("namespace", () => {
        const tsHeader = `
            namespace type {
                export const foo = "foobar";
            }`;

        const code = `
            return typeof type.foo + "|" + type.foo`;

        util.testFunction(code).setTsHeader(tsHeader).expectToMatchJsResult();
    });

    test("exported namespace (%p)", () => {
        util.testModule`
            export namespace type {
                export const foo = "foobar";
            }
            export const result = typeof type.foo + "|" + type.foo;
        `.expectToMatchJsResult();
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

        util.testFunction(code).setTsHeader(tsHeader).expectToMatchJsResult();
    });

    test.each(["result", "type ~= nil"])("exported merged namespace (%p)", returnExport => {
        util.testModule`
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
            export const result = \`\${t.method()}|\${type.staticMethod()}|\${typeof type.foo}|\${type.foo}|\${type.bar}\`;
        `
            .setReturnExport(returnExport)
            .expectToMatchJsResult();
    });
});

test("declaration-only variable with lua keyword as name is not renamed", () => {
    util.testFunction("type(7)")
        .setTsHeader("declare function type(this: void, a: unknown): string;")
        .expectLuaToMatchSnapshot();
});

test("exported variable with lua keyword as name is not renamed", () => {
    util.testModule`
        export const print = "foobar";
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/846
test("lua built-in as class method", () => {
    util.testModule`
        class MyClass {
            error() { return "Error!"; }
        }
        export const result = new MyClass().error();
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/833
test("lua built-in as object method", () => {
    util.testModule`
        const obj = { error: () => "Error!" };
        export const result = obj.error();
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/789
test("lua built-in as in constructor assignment", () => {
    util.testModule`
        class A {
            constructor(public error: string){}
        }

        export const result = new A("42").error;
    `.expectToMatchJsResult();
});
