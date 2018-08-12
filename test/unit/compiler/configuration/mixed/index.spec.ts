import { Expect, Test, TestCase, Teardown } from "alsatian";
import * as path from 'path';
import * as fs from 'fs';
import * as ts from "typescript";

import { CompilerOptions, findConfigFile, parseCommandLine, ParsedCommandLine, optionDeclarations } from "../../../../../src/CommandLineParser";
import { LuaLibImportKind } from "../../../../../src/Transpiler";

export class MixedConfigurationTests {

    @Test("tsconfig.json mixed with cmd line args")
    public tsconfigMixedWithCmdLineArgs() {
        const rootPath = __dirname;
        const tsConfigPath = path.join(rootPath, "project-tsconfig.json");
        const expectedTsConfig = ts.parseJsonConfigFileContent(
            ts.parseConfigFileTextToJson(tsConfigPath, fs.readFileSync(tsConfigPath).toString()).config,
            ts.sys,
            path.dirname(tsConfigPath)
        );        

        const parsedArgs = parseCommandLine([
            "-p",
            `"${tsConfigPath}"`,
            "--luaLibImport",
            LuaLibImportKind.Inline,
            `${path.join(rootPath, 'test.ts')}`,
        ]);
        
        Expect(parsedArgs.options).toEqual(<CompilerOptions>{
            ...expectedTsConfig.options,
            // Overridden by cmd args (set to "none" in project-tsconfig.json)
            luaLibImport: LuaLibImportKind.Inline,
            // Only set in tsconfig, TSTL default is "JIT"
            luaTarget: "5.1",
            // Only present in TSTL dfaults
            noHeader: optionDeclarations["noHeader"].default,
            project: tsConfigPath
        });
    }
}