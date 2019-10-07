import * as util from "../util";
import * as ts from "typescript";

const exportValueSource = `
    export const value = true;
`;

const reexportValueSource = `
    export { value } from "./export";
`;

test.each<[string, Record<string, string>]>([
    [
        "Import module -> main",
        {
            "main.ts": `
                import { value } from "./module";
                if (value !== true) {
                    throw "Failed to import x";
                }
            `,
            "module.ts": exportValueSource,
        },
    ],
    [
        "Import chain export -> reexport -> main",
        {
            "main.ts": `
                import { value } from "./reexport";
                if (value !== true) {
                    throw "Failed to import value";
                }
            `,
            "reexport.ts": reexportValueSource,
            "export.ts": exportValueSource,
        },
    ],
    [
        "Import chain with a different order",
        {
            "main.ts": `
                import { value } from "./reexport";
                if (value !== true) {
                    throw "Failed to import value";
                }
            `,
            "export.ts": exportValueSource,
            "reexport.ts": reexportValueSource,
        },
    ],
    [
        "Import diamond export -> reexport1 & reexport2 -> main",
        {
            "main.ts": `
                import { value as a } from "./reexport1";
                import { value as b } from "./reexport2";
                if (a !== true || b !== true) {
                    throw "Failed to import a or b";
                }
            `,
            "export.ts": exportValueSource,
            "reexport1.ts": reexportValueSource,
            "reexport2.ts": reexportValueSource,
        },
    ],
    [
        "Import diamond different order",
        {
            "reexport1.ts": reexportValueSource,
            "reexport2.ts": reexportValueSource,
            "export.ts": exportValueSource,
            "main.ts": `
                import { value as a } from "./reexport1";
                import { value as b } from "./reexport2";
                if (a !== true || b !== true) {
                    throw "Failed to import a or b";
                }
            `,
        },
    ],
    [
        "Modules in directories",
        {
            "main.ts": `
                import { value } from "./module/module";
                if (value !== true) {
                    throw "Failed to import value";
                }
            `,
            "module/module.ts": `
                export const value = true;
            `,
        },
    ],
    [
        "Modules aren't ordered by name",
        {
            "main.ts": `
                import { value } from "./a";
                if (value !== true) {
                    throw "Failed to import value";
                }
            `,
            "a.ts": `
                export const value = true;
            `,
        },
    ],
    [
        "Modules in directories",
        {
            "main/main.ts": `
                import { value } from "../module";
                if (value !== true) {
                    throw "Failed to import value";
                }
            `,
            "module.ts": `
                export const value = true;
            `,
        },
    ],
    [
        "LuaLibs are usable",
        {
            "module.ts": `
                export const array = [1, 2];
                array.push(3);
            `,
            "main.ts": `
                import { array } from "./module";
                if (array[2] !== 3) {
                    throw "Array's third item is not three";
                }            
            `,
        },
    ],
])("outFile tests (%s)", (_, files) => {
    const testBuilder = util.testBundle`
        ${files["main.ts"]}
    `
        .setOptions({ outFile: "main.lua", module: ts.ModuleKind.AMD })
        .setModuleSystem("require");

    const extraFiles = Object.keys(files)
        .map(file => ({ fileName: file, code: files[file] }))
        .filter(file => file.fileName !== "main.ts");

    extraFiles.forEach(extraFile => {
        testBuilder.addExtraFile(extraFile.fileName, extraFile.code);
    });

    testBuilder.expectNoExecutionError();
});
