import * as path from "path";
import * as ts from "typescript";
import * as tstl from "../../src";
import { transpileFilesResult } from "./run";

interface DirectoryTestCase {
    name: string;
    options: tstl.CompilerOptions;
}

test.each<DirectoryTestCase>([
    { name: "basic", options: {} },
    { name: "basic", options: { outDir: "out" } },
    { name: "basic", options: { rootDir: "src" } },
    { name: "basic", options: { rootDir: "src", outDir: "out" } },
    { name: "baseurl", options: { baseUrl: "./src/lib", rootDir: ".", outDir: "./out" } },
])("should be able to resolve (%p)", ({ name, options: compilerOptions }) => {
    const projectPath = path.join(__dirname, "directories", name);
    jest.spyOn(process, "cwd").mockReturnValue(projectPath);

    const config = {
        compilerOptions: { ...compilerOptions, types: [], skipLibCheck: true },
        tstl: { luaTarget: tstl.LuaTarget.LuaJIT, luaLibImport: tstl.LuaLibImportKind.Always },
    };

    const { fileNames, options } = tstl.updateParsedConfigFile(
        ts.parseJsonConfigFileContent(config, ts.sys, projectPath)
    );

    const { diagnostics, emittedFiles } = transpileFilesResult(fileNames, options);
    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles.map(f => f.name).sort()).toMatchSnapshot();
});
