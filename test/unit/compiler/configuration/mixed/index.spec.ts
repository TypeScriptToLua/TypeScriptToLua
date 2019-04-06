import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, LuaLibImportKind } from "../../../../../src";
import { parseCommandLine } from "../../../../../src/CommandLineParser";

test("tsconfig.json mixed with cmd line args", () => {
    const rootPath = __dirname;
    const tsConfigPath = path.join(rootPath, "project-tsconfig.json");
    const expectedTsConfig = ts.parseJsonConfigFileContent(
        ts.parseConfigFileTextToJson(tsConfigPath, fs.readFileSync(tsConfigPath).toString()).config,
        ts.sys,
        path.dirname(tsConfigPath),
        undefined,
        tsConfigPath,
    );

    const parsedArgs = parseCommandLine([
        "-p",
        `"${tsConfigPath}"`,
        "--luaLibImport",
        LuaLibImportKind.Inline,
        `${path.join(rootPath, "test.ts")}`,
    ]);

    if (parsedArgs.isValid === true) {
        expect(parsedArgs.result.options).toEqual({
            ...expectedTsConfig.options,
            // Overridden by cmd args (set to "none" in project-tsconfig.json)
            luaLibImport: LuaLibImportKind.Inline,
            // Only set in tsconfig, TSTL default is "JIT"
            luaTarget: "5.1",
            // Only present in TSTL dfaults
            noHeader: false,
            project: tsConfigPath,
            noHoisting: false,
            sourceMapTraceback: false,
        } as CompilerOptions);
    } else {
        expect(parsedArgs.isValid).toBeTruthy();
    }
});
