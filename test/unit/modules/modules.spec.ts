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
            .disableSemanticCheck()
            .setLuaHeader(`setmetatable(package.loaded, { __index = function() return { foo = "bar" } end })`)
            .setExport("foo")
            .expectToEqual("bar");
    }
);

test.each(["export default value;", "export { value as default };"])("Export Default From (%p)", exportStatement => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                export { default } from "./module";
            `,
            "module.ts": `
                export const value = true;
                ${exportStatement};
            `,
        },
        "default"
    );

    expect(result).toBe(true);
});

test("Default Import and Export Expression", () => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                import defaultExport from "./module";
                export const value = defaultExport;
            `,
            "module.ts": `
                export default 1 + 2 + 3;
            `,
        },
        "value"
    );

    expect(result).toBe(6);
});

test("Import and Export Assignment", () => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                import * as m from "./module";
                export const value = m;
            `,
            "module.ts": `
                export = true;
            `,
        },
        "value"
    );

    expect(result).toBe(true);
});

test("Mixed Exports, Default and Named Imports", () => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                import defaultExport, { a, b, c } from "./module";
                export const value = defaultExport + b + c;
            `,
            "module.ts": `
                export const a = 1;
                export const b = 2;
                export const c = 3;
                export default a;
            `,
        },
        "value"
    );

    expect(result).toBe(6);
});

test("Mixed Exports, Default and Namespace Import", () => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                import defaultExport, * as ns from "./module";
                export const value = defaultExport + ns.b + ns.c;
            `,
            "module.ts": `
                export const a = 1;
                export const b = 2;
                export const c = 3;
                export default a;
            `,
        },
        "value"
    );

    expect(result).toBe(6);
});

test("Export Default Function", () => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                import defaultExport from "./module";
                export const value = defaultExport();
            `,
            "module.ts": `
                export default function() {
                    return true;
                }
            `,
        },
        "value"
    );

    expect(result).toBe(true);
});

test.each([
    ["Test", "export default class Test { static method() { return true; } }"],
    ["default", "export default class { static method() { return true; } }"],
])("Export Default Class Name (%p)", (expectedClassName, classDeclarationStatement) => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                import defaultExport from "./module";
                export const value = defaultExport.name;
            `,
            "module.ts": classDeclarationStatement,
        },
        "value"
    );

    expect(result).toBe(expectedClassName);
});

test("Export Equals", () => {
    const [result] = util.transpileAndExecuteProjectReturningMainExport(
        {
            "main.ts": `
                import * as module from "./module";
                export const value = module;
            `,
            "module.ts": `
                export = true;
            `,
        },
        "value"
    );

    expect(result).toBe(true);
});
