import * as util from "../util";
import * as ts from "typescript";
import { CompilerOptions } from "../../src/CompilerOptions";

const exportValueSource = "export const value = true;";
const reexportValueSource = 'export { value } from "./export";';
const validateValueSource = 'if (value !== true) { throw "Failed to import value" }';

function outFileOptionsWithEntry(entry: string): CompilerOptions {
    return { outFile: "main.lua", noHoisting: true, module: ts.ModuleKind.AMD, luaEntry: [entry] };
}

describe("outFile", () => {
    test("import module -> main", () => {
        util.testBundle`
            import { value } from "./module";
            ${validateValueSource}
        `
            .addExtraFile("module.ts", exportValueSource)
            .setOptions(outFileOptionsWithEntry("main.ts"))
            .expectNoExecutionError();
    });

    test("import chain export -> reexport -> main", () => {
        util.testBundle`
            import { value } from "./reexport";
            ${validateValueSource}
        `
            .addExtraFile("reexport.ts", reexportValueSource)
            .addExtraFile("export.ts", exportValueSource)
            .setOptions(outFileOptionsWithEntry("main.ts"))
            .expectNoExecutionError();
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
            .setOptions(outFileOptionsWithEntry("main.ts"))
            .expectNoExecutionError();
    });

    test("module in directory", () => {
        util.testBundle`
            import { value } from "./module/module";
            ${validateValueSource}
        `
            .addExtraFile("module/module.ts", exportValueSource)
            .setOptions(outFileOptionsWithEntry("main.ts"))
            .expectNoExecutionError();
    });

    test("modules aren't ordered by name", () => {
        util.testBundle`
            import { value } from "./a";
            ${validateValueSource}
        `
            .addExtraFile("a.ts", exportValueSource)
            .setOptions(outFileOptionsWithEntry("main.ts"))
            .expectNoExecutionError();
    });

    test("entry point in directory", () => {
        util.testBundle``
            .addExtraFile(
                "main/main.ts",
                `
                    import { value } from "../module";
                    ${validateValueSource}
                `
            )
            .addExtraFile("module.ts", exportValueSource)
            .setOptions(outFileOptionsWithEntry("main/main.ts"))
            .expectNoExecutionError();
    });

    test("LuaLibs", () => {
        util.testBundle`
            import { array } from "./module";
            if (array[2] !== 3) {
                throw "Array's third item is not three";
            }
        `
            .addExtraFile(
                "module.ts",
                `
                    export const array = [1, 2];
                    array.push(3);
                `
            )
            .setOptions(outFileOptionsWithEntry("main.ts"))
            .expectNoExecutionError();
    });

    test("cyclic imports", () => {
        util.testBundle`
            export const a = true;
            import { value } from "./b";
            ${validateValueSource}
        `
            .addExtraFile(
                "b.ts",
                `
                    import { a } from "./main";
                    export const value = a;
                `
            )
            .setOptions(outFileOptionsWithEntry("main.ts"))
            .expectNoExecutionError();
    });
});
