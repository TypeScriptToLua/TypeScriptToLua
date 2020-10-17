import * as ts from "typescript";
import * as util from "../util";

describe("module import/export elision", () => {
    const moduleDeclaration = `
        declare module "module" {
            export type Type = string;
            export declare const value: string;
        }
    `;

    const expectToElideImport: util.TapCallback = builder => {
        builder.addExtraFile("module.d.ts", moduleDeclaration).setOptions({ module: ts.ModuleKind.CommonJS });
        expect(builder.getLuaExecutionResult()).not.toBeInstanceOf(util.ExecutionError);
    };

    test("should elide named type imports", () => {
        util.testModule`
            import { Type } from "module";
            const foo: Type = "bar";
        `.tap(expectToElideImport);
    });

    test("should elide named value imports used only as a type", () => {
        util.testModule`
            import { value } from "module";
            const foo: typeof value = "bar";
        `.tap(expectToElideImport);
    });

    test("should elide namespace imports with unused values", () => {
        util.testModule`
            import * as module from "module";
            const foo: module.Type = "bar";
        `.tap(expectToElideImport);
    });

    test("should elide `import =` declarations", () => {
        util.testModule`
            import module = require("module");
            const foo: module.Type = "bar";
        `.tap(expectToElideImport);
    });

    test("should elide type exports", () => {
        util.testModule`
            (globalThis as any).foo = true;
            type foo = boolean;
            export { foo };
        `.expectToEqual([]);
    });
});

test.each(["ke-bab", "dollar$", "singlequote'", "hash#", "s p a c e", "ɥɣɎɌͼƛಠ", "_̀ः٠‿"])(
    "Import module names with invalid lua identifier characters (%p)",
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

test.each(["export default value;", "export { value as default };"])("Export Default From (%p)", exportStatement => {
    util.testBundle`
        export { default } from "./module";
    `
        .addExtraFile(
            "module.ts",
            `
                export const value = true;
                ${exportStatement};
            `
        )
        .expectToEqual({ default: true });
});

test("Default Import and Export Expression", () => {
    util.testBundle`
        import defaultExport from "./module";
        export const value = defaultExport;
    `
        .addExtraFile("module.ts", "export default 1 + 2 + 3;")
        .expectToEqual({ value: 6 });
});

test("Import and Export Assignment", () => {
    util.testBundle`
        import m = require("./module");
        export const value = m;
    `
        .setOptions({ module: ts.ModuleKind.CommonJS })
        .addExtraFile("module.ts", "export = true;")
        .expectToEqual({ value: true });
});

test("Mixed Exports, Default and Named Imports", () => {
    util.testBundle`
        import defaultExport, { a, b, c } from "./module";
        export const value = defaultExport + b + c;
    `
        .addExtraFile(
            "module.ts",
            `
                export const a = 1;
                export const b = 2;
                export const c = 3;
                export default a;
            `
        )
        .expectToEqual({ value: 6 });
});

test("Mixed Exports, Default and Namespace Import", () => {
    util.testBundle`
        import defaultExport, * as ns from "./module";
        export const value = defaultExport + ns.b + ns.c;
    `
        .addExtraFile(
            "module.ts",
            `
                export const a = 1;
                export const b = 2;
                export const c = 3;
                export default a;
            `
        )
        .expectToEqual({ value: 6 });
});

test("Export Default Function", () => {
    util.testBundle`
        import defaultExport from "./module";
        export const value = defaultExport();
    `
        .addExtraFile("module.ts", "export default function() { return true; }")
        .expectToEqual({ value: true });
});

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

test.each(reassignmentTestCases)("export specifier with reassignment afterwards (%p)", reassignment => {
    util.testModule`
        let x = 0;
        export { x };
        ${reassignment};
    `.expectToMatchJsResult();
});

test.each(reassignmentTestCases)("export specifier fork (%p)", reassignment => {
    util.testModule`
        let x = 0;
        export { x as a };
        export { x as b };
        ${reassignment};
    `.expectToMatchJsResult();
});

test("does not export shadowed identifiers", () => {
    util.testModule`
        export let a = 1;
        { let a = 2; a = 3 };
    `.expectToMatchJsResult();
});

test("export as specifier shouldn't effect local vars", () => {
    util.testModule`
        let x = false;
        export { x as a };
        let a = 5;
        a = 6;
    `.expectToMatchJsResult();
});

test("export modified in for in loop", () => {
    util.testModule`
        export let foo = '';
        for (foo in { x: true }) {}
    `
        .setReturnExport("foo")
        .expectToMatchJsResult();
});

test("export dependency modified in for in loop", () => {
    util.testModule`
        let foo = '';
        export { foo as bar };
        for (foo in { x: true }) {}
    `
        .setReturnExport("bar")
        .expectToEqual("x");
});

test("export default class with future reference", () => {
    util.testModule`
        export default class Default {}
        const d = new Default();
        export const result = d.constructor.name;
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});

test("export default function with future reference", () => {
    util.testModule`
        export default function defaultFunction() {
            return true;
        }
        export const result = defaultFunction();
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});
