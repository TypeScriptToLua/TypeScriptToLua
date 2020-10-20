import * as tstl from "../../src";
import { createResolutionErrorDiagnostic } from "../../src/compiler/diagnostics";
import * as util from "../util";

const requireRegex = /require\("(.*?)"\)/;
const expectToRequire = (expected: string): util.TapCallback => builder => {
    const [, requiredPath] = builder.getMainLuaCodeChunk().match(requireRegex) ?? [];
    expect(requiredPath).toBe(expected);
};

const expectModuleTableToMatchSnapshot: util.TapCallback = builder => {
    builder.expectToHaveNoDiagnostics();
    const moduleTable = builder.getMainLuaCodeChunk().match(/(?<=\n)____modules = {\n(.+)\n}\nreturn [^\n]+$/s)?.[1];
    expect(moduleTable).not.toBeUndefined();
    expect(moduleTable).toMatchSnapshot("modules");
};

test("sibling file", () => {
    util.testBundle`
        import "./foo";
    `
        .addExtraFile("foo.ts", "")
        .tap(expectModuleTableToMatchSnapshot);
});

test("file in a sibling directory", () => {
    util.testBundle`
        import "./foo/bar.ts";
    `
        .addExtraFile("foo/bar.ts", "")
        .tap(expectModuleTableToMatchSnapshot);
});

test("sibling directory index", () => {
    util.testBundle`
        import "./foo";
    `
        .addExtraFile("foo/index.ts", "")
        .tap(expectModuleTableToMatchSnapshot);
});

test("current directory index", () => {
    util.testBundle`
        import ".";
    `
        .addExtraFile("index.ts", "")
        .tap(expectModuleTableToMatchSnapshot);
});

test("rootDir inference", () => {
    util.testBundle`
        import "./module";
    `
        .setMainFileName("src/main.ts")
        .addExtraFile("src/module.ts", "")
        .tap(expectModuleTableToMatchSnapshot);
});

test("entry point in nested directory", () => {
    util.testBundle`
        import "./module";
    `
        .setMainFileName("src/main.ts")
        .addExtraFile("src/module.ts", "")
        .setOptions({ rootDir: "src" })
        .tap(expectModuleTableToMatchSnapshot);
});

describe("resolution out of rootDir", () => {
    test(".lua file", () => {
        util.testBundle`
            export { value } from "../module";
        `
            .setOptions({ rootDir: "src" })
            .setMainFileName("src/main.ts")
            .addExtraFile("module.d.ts", "export declare const value: boolean;")
            .addRawFile("module.lua", "return { value = true }")

            .tap(expectToRequire("_.module"))
            .expectToEqual({ value: true });
    });

    test(".ts file", () => {
        util.testBundle`
            export { value } from "../module";
        `
            .setOptions({ rootDir: "src" })
            .setMainFileName("src/main.ts")
            .addExtraFile("module.ts", "export const value = true;")

            .tap(expectToRequire("_.module"))
            .expectDiagnosticsToMatchSnapshot([6059], true)
            .expectToEqual({ value: true });
    });
});

describe("package resolution", () => {
    test("without package.json", () => {
        util.testBundle`
            export { value } from 'lib';
        `
            .addExtraFile("node_modules/lib/index.d.ts", "export const value: boolean;")
            .addRawFile("node_modules/lib/index.lua", "return { value = true }")
            .tap(expectModuleTableToMatchSnapshot)
            .expectToEqual({ value: true });
    });

    test("package.json with exports", () => {
        util.testBundle`
            export { value } from 'lib';
        `
            .addExtraFile("node_modules/lib/index.d.ts", "export const value: boolean;")
            .addRawFile("node_modules/lib/dist/index.lua", "return { value = true }")
            .addRawFile("node_modules/lib/package.json", JSON.stringify({ exports: { lua: "./dist/index.lua" } }))
            .tap(expectModuleTableToMatchSnapshot)
            .expectToEqual({ value: true });
    });

    // https://github.com/webpack/enhanced-resolve/issues/256
    test.skip("package.json with directory exports", () => {
        util.testBundle`
            export { value } from 'lib/foo';
        `
            .addExtraFile("node_modules/lib/index.d.ts", 'declare module "lib/foo" { export const value: boolean; }')
            .addRawFile("node_modules/lib/dist/foo.lua", "return { value = true }")
            .addRawFile("node_modules/lib/package.json", JSON.stringify({ exports: { "./": { lua: "./dist/" } } }))
            .tap(expectModuleTableToMatchSnapshot)
            .expectToEqual({ value: true });
    });

    test("package.json with versioned exports", () => {
        util.testBundle`
            export { value } from 'lib';
        `
            .addExtraFile("node_modules/lib/index.d.ts", "export const value: boolean;")
            .addRawFile("node_modules/lib/dist/5.3.lua", 'return { value = "5.3" }')
            .addRawFile("node_modules/lib/dist/jit.lua", 'return { value = "jit" }')
            .addRawFile(
                "node_modules/lib/package.json",
                JSON.stringify({ exports: { "lua:5.3": "./dist/5.3.lua", "lua:jit": "./dist/jit.lua" } })
            )
            .tap(expectModuleTableToMatchSnapshot)
            .expectToEqual({ value: "5.3" });
    });

    test("package with dependencies", () => {
        util.testBundle`
            export { value } from 'lib';
        `
            .addExtraFile("node_modules/lib/index.d.ts", "export const value: boolean;")
            .addRawFile("node_modules/lib/index.lua", 'return require(__TS__Resolve("lib2"))')
            .addRawFile("node_modules/lib2/index.lua", "return { value = true }")
            .tap(expectModuleTableToMatchSnapshot)
            .expectToEqual({ value: true });
    });

    test.todo("symlink");
});

test("not transpiled script file error", () => {
    util.testBundle`
        declare function require(this: void, path: string): any;
        declare function __TS__Resolve(this: void, request: string): string;

        export const { value } = require(__TS__Resolve("./module"));
    `
        .addRawFile("module.ts", "export const value = true;")
        .expectDiagnosticsToMatchSnapshot([createResolutionErrorDiagnostic.code], true)
        .tap(expectModuleTableToMatchSnapshot)
        .expectToEqual(new util.ExecutionError("Resolved source file '/module.ts' is not a part of the project."));
});

test.each([
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {}
        `,
        mainCode: 'import "fake";',
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {}
        `,
        mainCode: 'import * as fake from "fake"; fake;',
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {
                export const x: number;
            }
        `,
        mainCode: 'import { x } from "fake"; x;',
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {
                export const x: number;
            }

            declare module "fake" {
                export const y: number;
            }
        `,
        mainCode: 'import { y } from "fake"; y;',
    },
])("@noResolution annotation (%p)", ({ declarationStatement, mainCode }) => {
    util.testModule(mainCode)
        .setMainFileName("src/main.ts")
        .addExtraFile("module.d.ts", declarationStatement)
        .tap(expectToRequire("fake"));
});

describe('mode: "lib"', () => {
    test("doesn't fail on unresolvable requests", () => {
        util.testBundle`
            import "./module";
        `
            .addExtraFile("module.d.ts", "export const foo = true;")
            .setOptions({ mode: tstl.CompilerMode.Lib })
            .expectToHaveNoDiagnostics()
            .tap(expectModuleTableToMatchSnapshot);
    });

    test.todo('gets resolved with mode: "app" from different compilation');
});
