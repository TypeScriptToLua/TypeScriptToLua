import * as path from "path";
import * as ts from "typescript";
import { LuaLibImportKind } from "../../src";
import * as util from "../util";

test("import module -> main", () => {
    util.testBundle`
        export { value } from "./module";
    `
        .addExtraFile("module.ts", "export const value = true")
        .expectToEqual({ value: true });
});

test("bundle file name", () => {
    const { transpiledFiles } = util.testModule`
    export { value } from "./module";
`
        .addExtraFile("module.ts", "export const value = true")
        .setOptions({ luaBundle: "mybundle.lua", luaBundleEntry: "main.ts" })
        .expectToHaveNoDiagnostics()
        .getLuaResult();

    expect(transpiledFiles.length).toBe(1);
    expect(transpiledFiles[0].fileName).toBe(
        path.join(ts.sys.getCurrentDirectory(), "mybundle.lua").replace(/\\/g, "/")
    );
});

test("import chain export -> reexport -> main", () => {
    util.testBundle`
        export { value } from "./reexport";
    `
        .addExtraFile("reexport.ts", "export { value } from './export'")
        .addExtraFile("export.ts", "export const value = true")
        .expectToEqual({ value: true });
});

test("diamond imports/exports -> reexport1 & reexport2 -> main", () => {
    util.testBundle`
        export { value as a } from "./reexport1";
        export { value as b } from "./reexport2";
    `
        .addExtraFile("reexport1.ts", "export { value } from './export'")
        .addExtraFile("reexport2.ts", "export { value } from './export'")
        .addExtraFile("export.ts", "export const value = true")
        .expectToEqual({ a: true, b: true });
});

test("module in directory", () => {
    util.testBundle`
        export { value } from "./module/module";
    `
        .addExtraFile("module/module.ts", "export const value = true")
        .expectToEqual({ value: true });
});

test("modules aren't ordered by name", () => {
    util.testBundle`
        export { value } from "./a";
    `
        .addExtraFile("a.ts", "export const value = true")
        .expectToEqual({ value: true });
});

test("entry point in directory", () => {
    util.testBundle``
        .addExtraFile(
            "main/main.ts",
            `
                export { value } from "../module";
            `
        )
        .addExtraFile("module.ts", "export const value = true")
        .setEntryPoint("main/main.ts")
        .expectToEqual({ value: true });
});

test("LuaLibImportKind.Require", () => {
    util.testBundle`
        export const result = [1, 2];
        result.push(3);
    `
        .setOptions({ luaLibImport: LuaLibImportKind.Require })
        .expectToEqual({ result: [1, 2, 3] });
});

test("LuaLibImportKind.Inline generates a warning", () => {
    util.testBundle`
        export const result = [1, 2];
        result.push(3);
    `
        .setOptions({ luaLibImport: LuaLibImportKind.Inline })
        .expectDiagnostics(
            m =>
                m.toMatchInlineSnapshot(
                    `"warning TSTL: Using 'luaBundle' with 'luaLibImport: \\"inline\\"' might generate duplicate code. It is recommended to use 'luaLibImport: \\"require\\"'"`
                ),
            true
        )
        .expectToEqual({ result: [1, 2, 3] });
});

test("cyclic imports", () => {
    util.testBundle`
        import * as b from "./b";
        export const a = true;
        export const valueResult = b.value;
        export const lazyValueResult = b.lazyValue();
    `
        .addExtraFile(
            "b.ts",
            `
                import * as a from "./main";
                export const value = a.a;
                export const lazyValue = () => a.a;
            `
        )
        .expectToEqual(new util.ExecutionError("stack overflow"));
});

test("no entry point", () => {
    util.testBundle``
        .setOptions({ luaBundleEntry: undefined })
        .expectDiagnostics(
            m => m.toMatchInlineSnapshot(`"error TSTL: 'luaBundleEntry' is required when 'luaBundle' is enabled."`),
            true
        );
});

test("luaEntry doesn't exist", () => {
    util.testBundle``
        .setEntryPoint("entry.ts")
        .expectDiagnostics(
            m =>
                m.toMatchInlineSnapshot(
                    `"error TSTL: Could not find bundle entry point 'entry.ts'. It should be a file in the project."`
                ),
            true
        );
});
