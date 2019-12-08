import { Position, SourceMapConsumer } from "source-map";
import * as tstl from "../../../src";
import * as util from "../../util";

test.each([
    {
        code: `
            const abc = "foo";
            const def = "bar";

            const xyz = "baz";
        `,

        assertPatterns: [
            { luaPattern: "abc", typeScriptPattern: "abc" },
            { luaPattern: "def", typeScriptPattern: "def" },
            { luaPattern: "xyz", typeScriptPattern: "xyz" },
            { luaPattern: `"foo"`, typeScriptPattern: `"foo"` },
            { luaPattern: `"bar"`, typeScriptPattern: `"bar"` },
            { luaPattern: `"baz"`, typeScriptPattern: `"baz"` },
        ],
    },
    {
        code: `
            function abc() {
                return def();
            }

            function def() {
                return "foo";
            }
        `,

        assertPatterns: [
            { luaPattern: "function abc(", typeScriptPattern: "function abc() {" },
            { luaPattern: "function def(", typeScriptPattern: "function def() {" },
            { luaPattern: "return def(", typeScriptPattern: "return def(" },
            { luaPattern: "end", typeScriptPattern: "function def() {" },
        ],
    },
    {
        code: `
            const enum abc { foo = 2, bar = 4 };
            const xyz = abc.foo;
        `,

        assertPatterns: [
            { luaPattern: "xyz", typeScriptPattern: "xyz" },
            { luaPattern: "2", typeScriptPattern: "abc.foo" },
        ],
    },
    {
        code: `
            // @ts-ignore
            import { Foo } from "foo";
            Foo;
        `,

        assertPatterns: [
            { luaPattern: 'require("foo")', typeScriptPattern: '"foo"' },
            { luaPattern: "Foo", typeScriptPattern: "Foo" },
        ],
    },
    {
        code: `
            // @ts-ignore
            import * as Foo from "foo";
            Foo;
        `,

        assertPatterns: [
            { luaPattern: 'require("foo")', typeScriptPattern: '"foo"' },
            { luaPattern: "Foo", typeScriptPattern: "Foo" },
        ],
    },
    {
        code: `
            // @ts-ignore
            class Bar extends Foo {
                constructor() {
                    super();
                }
            }
        `,

        assertPatterns: [
            { luaPattern: "Bar = __TS__Class()", typeScriptPattern: "class Bar" },
            { luaPattern: "Bar.name =", typeScriptPattern: "class Bar" },
            { luaPattern: "Bar.____super = Foo", typeScriptPattern: "Foo {" },
            { luaPattern: "setmetatable(Bar,", typeScriptPattern: "Foo {" },
            { luaPattern: "setmetatable(Bar.prototype,", typeScriptPattern: "Foo {" },
            { luaPattern: "function Bar.prototype.____constructor", typeScriptPattern: "constructor" },
        ],
    },
    {
        code: `
            class Foo {
            }
        `,

        assertPatterns: [{ luaPattern: "function Foo.prototype.____constructor", typeScriptPattern: "class Foo" }],
    },
    {
        code: `
            class Foo {
                bar = "baz";
            }
        `,

        assertPatterns: [{ luaPattern: "function Foo.prototype.____constructor", typeScriptPattern: "class Foo" }],
    },
    {
        code: `
            declare const arr: string[];
            for (const element of arr) {}
        `,

        assertPatterns: [
            { luaPattern: "arr", typeScriptPattern: "arr)" },
            { luaPattern: "element", typeScriptPattern: "element" },
        ],
    },
    {
        code: `
            declare function getArr(this: void): string[];
            for (const element of getArr()) {}
        `,

        assertPatterns: [
            { luaPattern: "for", typeScriptPattern: "for" },
            { luaPattern: "getArr()", typeScriptPattern: "getArr()" },
            { luaPattern: "element", typeScriptPattern: "element" },
        ],
    },
    {
        code: `
            declare const arr: string[]
            for (let i = 0; i < arr.length; ++i) {}
        `,

        assertPatterns: [
            { luaPattern: "i = 0", typeScriptPattern: "i = 0" },
            { luaPattern: "i < #arr", typeScriptPattern: "i < arr.length" },
            { luaPattern: "i + 1", typeScriptPattern: "++i" },
        ],
    },
])("Source map has correct mapping (%p)", async ({ code, assertPatterns }) => {
    const file = util
        .testModule(code)
        .expectToHaveNoDiagnostics()
        .getMainLuaFileResult();

    const consumer = await new SourceMapConsumer(file.sourceMap);
    for (const { luaPattern, typeScriptPattern } of assertPatterns) {
        const luaPosition = lineAndColumnOf(file.lua, luaPattern);
        const mappedPosition = consumer.originalPositionFor(luaPosition);
        const typescriptPosition = lineAndColumnOf(code, typeScriptPattern);

        expect(mappedPosition).toMatchObject(typescriptPosition);
    }
});

test("Source map has correct sources", async () => {
    const file = util.testModule`
        const foo = "foo"
    `
        .expectToHaveNoDiagnostics()
        .getMainLuaFileResult();

    const consumer = await new SourceMapConsumer(file.sourceMap);
    expect(consumer.sources.length).toBe(1);
    expect(consumer.sources[0]).toBe("main.ts");
});

test("Source map has correct source root", async () => {
    const file = util.testModule`
        const foo = "foo"
    `
        .expectToHaveNoDiagnostics()
        .getMainLuaFileResult();

    const sourceMap = JSON.parse(file.sourceMap);
    expect(sourceMap.sourceRoot).toBe(".");
});

test.each([
    { code: `const type = "foobar";`, name: "type" },
    { code: `const and = "foobar";`, name: "and" },
    { code: `const $$$ = "foobar";`, name: "$$$" },
    { code: `const foo = { bar() { this; } };`, name: "this" },
    { code: `function foo($$$: unknown) {}`, name: "$$$" },
    { code: `class $$$ {}`, name: "$$$" },
    { code: `namespace $$$ { const foo = "bar"; }`, name: "$$$" },
])("Source map has correct name mappings (%p)", async ({ code, name }) => {
    const file = util
        .testModule(code)
        .expectToHaveNoDiagnostics()
        .getMainLuaFileResult();

    const consumer = await new SourceMapConsumer(file.sourceMap);
    const typescriptPosition = lineAndColumnOf(code, name);
    let mappedName: string | undefined;
    consumer.eachMapping(mapping => {
        if (mapping.originalLine === typescriptPosition.line && mapping.originalColumn === typescriptPosition.column) {
            mappedName = mapping.name;
        }
    });

    expect(mappedName).toBe(name);
});

test("sourceMapTraceback saves sourcemap in _G", () => {
    const code = `
        function abc() {
            return "foo";
        }

        return (globalThis as any).__TS__sourcemap;
    `;

    const builder = util
        .testFunction(code)
        .setOptions({ sourceMapTraceback: true, luaLibImport: tstl.LuaLibImportKind.Inline });

    const sourceMap = builder.getLuaExecutionResult();
    const transpiledLua = builder.getMainLuaCodeChunk();

    expect(sourceMap).toEqual(expect.any(Object));
    const sourceMapFiles = Object.keys(sourceMap);
    expect(sourceMapFiles).toHaveLength(1);
    const mainSourceMap = sourceMap[sourceMapFiles[0]];

    const assertPatterns = [
        { luaPattern: "function abc(", typeScriptPattern: "function abc() {" },
        { luaPattern: `return "foo"`, typeScriptPattern: `return "foo"` },
    ];

    for (const { luaPattern, typeScriptPattern } of assertPatterns) {
        const luaPosition = lineAndColumnOf(transpiledLua, luaPattern);
        const mappedLine = mainSourceMap[luaPosition.line.toString()];

        const typescriptPosition = lineAndColumnOf(code, typeScriptPattern);
        expect(mappedLine).toEqual(typescriptPosition.line);
    }
});

test("Inline sourcemaps", () => {
    const code = `
        function abc() {
            return def();
        }

        function def() {
            return "foo";
        }

        return abc();
    `;

    const file = util
        .testFunction(code)
        .setOptions({ inlineSourceMap: true })
        .expectToMatchJsResult()
        .getMainLuaFileResult();

    const inlineSourceMapMatch = file.lua.match(/--# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/);
    if (util.expectToBeDefined(inlineSourceMapMatch)) {
        const inlineSourceMap = Buffer.from(inlineSourceMapMatch[1], "base64").toString();
        expect(file.sourceMap).toBe(inlineSourceMap);
    }
});

// Helper functions

function lineAndColumnOf(text: string, pattern: string): Position {
    const pos = text.indexOf(pattern);
    if (pos === -1) {
        return { line: -1, column: -1 };
    }

    const lineLengths = text.split("\n").map(s => s.length);

    let totalPos = 0;
    for (let line = 1; line <= lineLengths.length; line++) {
        // Add + 1 for the removed \n
        const lineLength = lineLengths[line - 1] + 1;
        if (pos < totalPos + lineLength) {
            return { line, column: pos - totalPos };
        }

        totalPos += lineLengths[line - 1] + 1;
    }

    return { line: -1, column: -1 };
}
