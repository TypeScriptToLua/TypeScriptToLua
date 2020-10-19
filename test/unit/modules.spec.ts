import * as ts from "typescript";
import * as util from "../util";

test("export const value", () => {
    util.testModule`
        export const value = true;
    `.expectToMatchJsResult();
});

describe("export default", () => {
    test("literal", () => {
        util.testModule`
            export default true;
        `.expectToMatchJsResult();
    });

    test("class", () => {
        util.testModule`
            export default class Default {}
            const d = new Default();
            export const result = d.constructor.name;
        `
            .setReturnExport("result")
            .expectToMatchJsResult();
    });

    test("function", () => {
        util.testModule`
            export default function defaultFunction() {
                return true;
            }
            export const result = defaultFunction();
        `
            .setReturnExport("result")
            .expectToMatchJsResult();
    });
});

describe("export { ... }", () => {
    test("export { value }", () => {
        util.testModule`
            const value = true;
            export { value };
        `.expectToMatchJsResult();
    });

    test("export { value as result }", () => {
        util.testModule`
            const value = true;
            export { value as result };
        `.expectToMatchJsResult();
    });

    test("export { value as default }", () => {
        util.testModule`
            const value = true;
            export { value as default };
        `.expectToMatchJsResult();
    });
});

describe("export ... from", () => {
    test("export { value } from '...'", () => {
        util.testBundle`
            export { value } from "./module";
        `
            .addExtraFile("module.ts", "export const value = true;")
            .expectToEqual({ value: true });
    });

    test("export { value as result } from '...'", () => {
        util.testBundle`
            export { value as result } from "./module";
        `
            .addExtraFile("module.ts", "export const value = true;")
            .expectToEqual({ result: true });
    });

    test("export { value as result1, value as result2 } from '...'", () => {
        util.testBundle`
            export { value as result1, value as result2 } from "./module";
        `
            .addExtraFile("module.ts", "export const value = true;")
            .expectToEqual({ result1: true, result2: true });
    });

    test("export { default } from '...'", () => {
        util.testBundle`
            export { default } from "./module";
        `
            .addExtraFile("module.ts", "export default true;")
            .expectToEqual({ default: true });
    });

    test("export * from '...'", () => {
        util.testBundle`
            export * from "./module";
        `
            .addExtraFile(
                "module.ts",
                `
                    export const a = "a";
                    export const b = "b";
                    export default "default";
                `
            )
            // TODO: Doesn't match JS
            .expectToEqual({ a: "a", b: "b", default: "default" });
    });
});

describe("export live bindings", () => {
    const reassignmentTestCases = [
        "x = 1",
        "x++",
        "(x = 1)",
        "[x] = [1]",
        "[[x]] = [[1]]",
        "({ x } = { x: 1 })",
        "({ y: x } = { y: 1 })",
        "({ x = 1 } = { x: undefined })",
    ];

    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/926
    test.each(reassignmentTestCases.filter(c => !c.includes(" } = { x: ")))("export variable (%p)", reassignment => {
        util.testModule`
            export let x = 0;
            ${reassignment};
        `.expectToMatchJsResult();
    });

    test.each(reassignmentTestCases)("export variable as a binding (%p)", reassignment => {
        util.testModule`
            let x = 0;
            export { x };
            ${reassignment};
        `.expectToMatchJsResult();
    });

    test.each(reassignmentTestCases)("export variable with multiple bindings (%p)", reassignment => {
        util.testModule`
            let x = 0;
            export { x as a };
            export { x as b };
            ${reassignment};
        `.expectToMatchJsResult();
    });

    // Can't be added to reassignmentTestCases because of https://github.com/microsoft/TypeScript/issues/35881
    test("export variable (for in loop)", () => {
        util.testModule`
            export let foo = '';
            for (foo in { x: true }) {}
        `
            .setReturnExport("foo")
            .expectToMatchJsResult();
    });

    test("export variable as a binding (for in loop)", () => {
        util.testModule`
            let foo = '';
            export { foo as bar };
            for (foo in { x: true }) {}
        `
            .setReturnExport("bar")
            .expectToEqual("x");
    });

    test("does not update shadowed names", () => {
        util.testModule`
            export let a = 1;
            { let a = 2; a = 3 };
        `.expectToMatchJsResult();
    });

    test("renamed export specifier shouldn't effect local vars", () => {
        util.testModule`
            let x = false;
            export { x as a };
            let a = 5;
            a = 6;
        `.expectToMatchJsResult();
    });
});

describe("import ...", () => {
    test("import { value }", () => {
        util.testBundle`
            import { value } from "./module";
            export const result = value;
        `
            .addExtraFile("module.ts", "export const value = true;")
            .expectToEqual({ result: true });
    });

    test("import { value as x }", () => {
        util.testBundle`
            import { value as x } from "./module";
            export const result = x;
        `
            .addExtraFile("module.ts", "export const value = true;")
            .expectToEqual({ result: true });
    });

    test("import * as ns", () => {
        util.testBundle`
            import * as ns from "./module";
            export { ns }
        `
            .addExtraFile(
                "module.ts",
                `
                    export const a = "a";
                    export const b = "b";
                    export default "default";
                `
            )
            .expectToEqual({ ns: { a: "a", b: "b", default: "default" } });
    });

    test("import defaultValue", () => {
        util.testBundle`
            import defaultValue from "./module";
            export const result = defaultValue;
        `
            .addExtraFile("module.ts", "export default true;")
            .expectToEqual({ result: true });
    });

    test('import "..."', () => {
        util.testBundle`
            import { state } from "./state";
            import "./module";
            export const result = state.loaded;
        `
            .addExtraFile(
                "module.ts",
                `
                    import { state } from "./state";
                    state.loaded = true;
                `
            )
            .addExtraFile("state.ts", "export const state = { loaded: false };")
            .expectToEqual({ result: true });
    });
});

test("export =", () => {
    util.testModule`
        export = true;
    `
        .setOptions({ module: ts.ModuleKind.CommonJS })
        .expectToMatchJsResult();
});

test("import =", () => {
    util.testBundle`
        import module = require("./module");
        export const result = module;
    `
        .addRawFile("module.lua", "return true")
        .addExtraFile("module.d.ts", "export = true;")
        .setOptions({ module: ts.ModuleKind.CommonJS })
        .expectToEqual({ result: true });
});

describe("import and export elision", () => {
    const moduleDeclaration = `
        export type Type = string;
        export const value: string;
        export default value;
    `;

    const expectToElideImport: util.TapCallback = builder => {
        builder.addExtraFile("module.d.ts", moduleDeclaration).expectToHaveNoDiagnostics().expectNoExecutionError();
    };

    test("should elide named type imports", () => {
        util.testModule`
            import { Type } from "./module";
            const foo: Type = "bar";
        `.tap(expectToElideImport);
    });

    test("should elide named value imports used only as a type", () => {
        util.testModule`
            import { value } from "./module";
            const foo: typeof value = "bar";
        `.tap(expectToElideImport);
    });

    test("should elide unused default imports", () => {
        util.testModule`
            import defaultValue from "./module";
        `.tap(expectToElideImport);
    });

    test("should elide mixed imports", () => {
        util.testBundle`
            import defaultValue, { value } from "./module";
            export const result = defaultValue;
        `
            .addExtraFile("module.d.ts", moduleDeclaration)
            .addRawFile("module.lua", "return { default = true }")
            .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toContain("a = "))
            .expectToEqual({ result: true });
    });

    test("should elide namespace imports with unused values", () => {
        util.testModule`
            import * as module from "./module";
            const foo: module.Type = "bar";
        `.tap(expectToElideImport);
    });

    test("should elide `import =` declarations", () => {
        util.testModule`
            import module = require("./module");
            const foo: module.Type = "bar";
        `
            .setOptions({ module: ts.ModuleKind.CommonJS })
            .tap(expectToElideImport);
    });

    test("should elide type exports", () => {
        util.testModule`
            (globalThis as any).foo = true;
            type foo = boolean;
            export { foo };
        `.expectToEqual([]);
    });
});

test.each(["ke-bab", "dollar$", "singlequote'", "hash#", "s p a c e", "ɥɣɎɌͼƛಠ", "_̀ः٠‿", ".dot"])(
    "import local identifier generation (%p)",
    name => {
        util.testBundle`
            import { foo } from "./${name}";
            export { foo };
        `
            .addExtraFile(`${name}.ts`, "export const foo = true;")
            .expectToEqual({ foo: true })
            .tap(builder => {
                const identifier = builder.getMainLuaCodeChunk().match(/local (.+) = require\(/)?.[1];
                expect(identifier).toMatchSnapshot("local identifier");
            });
    }
);
