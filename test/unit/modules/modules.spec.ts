import * as ts from "typescript";
import * as TSTLErrors from "../../../src/TSTLErrors";
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

test.each([
    `export { default } from "..."`,
    `export { x as default } from "...";`,
    `export { default as x } from "...";`,
])("Export default disallowed (%p)", exportStatement => {
    util.testModule(exportStatement)
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(TSTLErrors.UnsupportedDefaultExport(util.nodeStub));
});

test("Import default disallowed", () => {
    util.testModule`
        import Test from "...";
    `
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(TSTLErrors.DefaultImportsNotSupported(util.nodeStub));
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
