import * as util from "../util";
import * as TSTLErrors from "../../src/TSTLErrors";

test("import module -> main", () => {
    util.testBundle`
        export { value } from "./module";
    `
        .addExtraFile("module.ts", "export const value = true")
        .expectToEqual({ value: true });
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
        .setOptions({ luaEntry: "main/main.ts" })
        .expectToEqual({ value: true });
});

test("LuaLibs", () => {
    util.testBundle`
        export const result = [1, 2];
        result.push(3);
    `.expectToEqual({ result: [1, 2, 3] });
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
        .expectToEqual({ a: true, lazyValueResult: true });
});

test("luaEntry doesn't exist", () => {
    util.testBundle``
        .setOptions({ luaEntry: "entry.ts" })
        .expectToHaveDiagnosticOfError(TSTLErrors.LuaEntryNotFound("entry.ts"));
});

test("luaEntry resolved from path specified in tsconfig", () => {
    util.testBundle``
        .addExtraFile("src/main.ts", "")
        .addExtraFile("src/module.ts", "")
        .setOptions({ rootDir: "src" })
        .expectToHaveNoDiagnostics();
});

test("export equals", () => {
    util.testBundle`export = "result"`.expectToEqual("result");
});
