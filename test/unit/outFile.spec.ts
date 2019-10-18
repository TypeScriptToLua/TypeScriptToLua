import * as util from "../util";
import * as TSTLErrors from "../../src/TSTLErrors";

const exportValueSource = "export const value = true;";
const reexportValueSource = 'export { value } from "./export";';
const exportResultSource = "export const result = value;";

test("import module -> main", () => {
    util.testBundle`
        import { value } from "./module";
        ${exportResultSource}
    `
        .addExtraFile("module.ts", exportValueSource)
        .expectToEqual({ result: true });
});

test("import chain export -> reexport -> main", () => {
    util.testBundle`
        import { value } from "./reexport";
        ${exportResultSource}
    `
        .addExtraFile("reexport.ts", reexportValueSource)
        .addExtraFile("export.ts", exportValueSource)
        .expectToEqual({ result: true });
});

test("diamond imports/exports -> reexport1 & reexport2 -> main", () => {
    util.testBundle`
        import { value as a } from "./reexport1";
        import { value as b } from "./reexport2";
        if (a !== true || b !== true) {
            throw "Failed to import a or b";
        }
    `
        .addExtraFile("reexport1.ts", reexportValueSource)
        .addExtraFile("reexport2.ts", reexportValueSource)
        .addExtraFile("export.ts", exportValueSource)
        .expectNoExecutionError();
});

test("module in directory", () => {
    util.testBundle`
        import { value } from "./module/module";
        ${exportValueSource}
    `
        .addExtraFile("module/module.ts", exportValueSource)
        .expectNoExecutionError();
});

test("modules aren't ordered by name", () => {
    util.testBundle`
        import { value } from "./a";
        ${exportResultSource}
    `
        .addExtraFile("a.ts", exportValueSource)
        .expectToEqual({ result: true });
});

test("entry point in directory", () => {
    util.testBundle``
        .addExtraFile(
            "main/main.ts",
            `
                import { value } from "../module";
                ${exportResultSource}
            `
        )
        .addExtraFile("module.ts", exportValueSource)
        .setOptions({ luaEntry: "main/main.ts" })
        .expectToEqual({ result: true });
});

test("LuaLibs", () => {
    util.testBundle`
        export const result = [1, 2];
        result.push(3);
    `.expectToEqual({ result: [1, 2, 3] });
});

test("cyclic imports", () => {
    util.testBundle`
        export const a = true;
        import { value } from "./b";
        ${exportResultSource}
    `
        .addExtraFile(
            "b.ts",
            `
                import { a } from "./main";
                export const value = a;
            `
        )
        .setOptions({ noHoisting: true })
        .expectToEqual({ a: true, result: true });
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
