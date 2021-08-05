import { BuildMode, LuaLibImportKind } from "../../src";
import * as diagnosticFactories from "../../src/transpilation/diagnostics";
import * as util from "../util";

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
        .setEntryPoint("main/main.ts")
        .expectToEqual({ value: true });
});

test("entry point in rootDir", () => {
    util.testModule`
        export { value } from "./module";
    `
        .setMainFileName("src/main.ts")
        .addExtraFile("src/module.ts", "export const value = true")
        .setOptions({ rootDir: "src", luaBundle: "bundle.lua", luaBundleEntry: "src/main.ts" })
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
        .expectDiagnosticsToMatchSnapshot(
            [diagnosticFactories.usingLuaBundleWithInlineMightGenerateDuplicateCode.code],
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

test("does not evaluate files multiple times", () => {
    util.testBundle`
        import "./countingfile";
        import "./otherfile";

        export const count = _count;
    `
        .addExtraFile(
            "otherfile.ts",
            `
                import "./countingfile";
            `
        )
        .addExtraFile(
            "countingfile.ts",
            `
                declare var _count: number | undefined;
                _count = (_count ?? 0) + 1;
            `
        )
        .expectToEqual({ count: 1 });
});

test("no entry point", () => {
    util.testBundle``
        .setOptions({ luaBundleEntry: undefined })
        .expectDiagnosticsToMatchSnapshot([diagnosticFactories.luaBundleEntryIsRequired.code], true);
});

test("luaEntry doesn't exist", () => {
    util.testBundle``
        .setEntryPoint("entry.ts")
        .expectDiagnosticsToMatchSnapshot([diagnosticFactories.couldNotFindBundleEntryPoint.code], true);
});

test("bundling not allowed for buildmode library", () => {
    util.testBundle``
        .setOptions({ buildMode: BuildMode.Library })
        .expectDiagnosticsToMatchSnapshot([diagnosticFactories.cannotBundleLibrary.code], true);
});
