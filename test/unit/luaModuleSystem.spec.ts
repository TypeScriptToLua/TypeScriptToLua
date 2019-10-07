import * as util from "../util";
import * as ts from "typescript";
import { LuaModuleSystemKind } from "../../src";

test.each<[string, Record<string, string>]>([
    [
        "Import module without package or require",
        {
            "main.ts": `
                import { value } from "./module";
                if (value !== true) {
                    throw "Failed to import value";
                }
            `,
            "module.ts": `
                export const value = true;
            `,
        },
    ],
])("luaModuleSystem with outFile (%s)", (_, files) => {
    const testBuilder = util.testBundle`
        ${files["main.ts"]}
    `
        .setOptions({ outFile: "main.lua", module: ts.ModuleKind.AMD, luaModuleSystem: LuaModuleSystemKind.None })
        .setModuleSystem("none");

    const extraFiles = Object.keys(files)
        .map(file => ({ fileName: file, code: files[file] }))
        .filter(file => file.fileName !== "main.ts");

    extraFiles.forEach(extraFile => {
        testBuilder.addExtraFile(extraFile.fileName, extraFile.code);
    });

    testBuilder.expectNoExecutionError();
});
