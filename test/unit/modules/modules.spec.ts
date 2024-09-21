import * as ts from "typescript";
import * as util from "../../util";

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
        util.testModule`
            import { foo } from "./${name}";
            export { foo };
        `
            .addExtraFile(`${name}.ts`, 'export const foo = "bar";')
            .setReturnExport("foo")
            .expectToEqual("bar");
    }
);

test.each(["export default value;", "export { value as default };"])("Export Default From (%p)", exportStatement => {
    util.testModule`
        export { default } from "./module";
    `
        .addExtraFile(
            "module.ts",
            `
                export const value = true;
                ${exportStatement};
            `
        )
        .expectToMatchJsResult();
});

test("Default Import and Export Expression", () => {
    util.testModule`
        import defaultExport from "./module";
        export const value = defaultExport;
    `
        .addExtraFile(
            "module.ts",
            `
                export default 1 + 2 + 3;
            `
        )
        .expectToMatchJsResult();
});

test("Import and Export Assignment", () => {
    util.testModule`
        // @ts-ignore
        import * as m from "./module";
        export const value = m;
    `
        .setOptions({ module: ts.ModuleKind.CommonJS })
        .addExtraFile(
            "module.ts",
            `
                export = true;
            `
        )
        .expectToMatchJsResult();
});

test("Mixed Exports, Default and Named Imports", () => {
    util.testModule`
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
        .expectToMatchJsResult();
});

test("Mixed Exports, Default and Namespace Import", () => {
    util.testModule`
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
        .expectToMatchJsResult();
});

test("Export Default Function", () => {
    const mainCode = `
        import defaultExport from "./module";
        export const value = defaultExport();
    `;
    util.testModule(mainCode)
        .addExtraFile(
            "module.ts",
            `
                export default function() {
                    return true;
                }
            `
        )
        .expectToMatchJsResult();
});

test("Export Equals", () => {
    util.testModule`
        export = true;
    `
        .setOptions({ module: ts.ModuleKind.CommonJS })
        .expectToMatchJsResult();
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

const moduleFile = `
export default true;
export const foo = "bar";
`;

test("export all does not include default", () => {
    util.testModule`
        export * from "./module";
    `
        .setOptions({ module: ts.ModuleKind.CommonJS })
        .addExtraFile("module.ts", moduleFile)
        .expectToMatchJsResult();
});

test("namespace export does not include default", () => {
    util.testModule`
        export * as result from "./module";
    `
        .addExtraFile("module.ts", moduleFile)
        .expectToMatchJsResult();
});

test("namespace export with unsafe Lua name", () => {
    util.testModule`
        export * as $$$ from "./module";
    `
        .addExtraFile("module.ts", moduleFile)
        .expectToMatchJsResult();
});

test("import expression", () => {
    util.testModule`
        let result;
        import("./module").then(m => { result = m.foo(); });
        export { result };
    `
        .addExtraFile("module.ts", 'export function foo() { return "foo"; }')
        .setOptions({ module: ts.ModuleKind.ESNext })
        .expectToEqual({ result: "foo" });
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1572
test("correctly exports @compileMembersOnly enums (#1572)", () => {
    util.testModule`
        export { val } from "./otherfile";
    `
        .addExtraFile(
            "otherfile.ts",
            `
        // Would put this in the main file, but we cannot transfer enum types over lua/js boundary
        // but we still need to have an exported enum, hence it is in another file
        /** @compileMembersOnly */
        export enum MyEnum {
            A = 0,
            B = 1,
            C = 2
        }
        export const val = MyEnum.B | MyEnum.C;
    `
        )
        .expectToEqual({ val: 3 });
});
