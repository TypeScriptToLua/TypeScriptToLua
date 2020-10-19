import * as ts from "typescript";
import * as tstl from "../../src";
import { resolveFixture, transpileFilesResult } from "./run";

const projectRoot = resolveFixture("directories");
test.each([{}, { outDir: "out" }, { rootDir: "src" }, { rootDir: "src", outDir: "out" }])(
    "should be able to resolve (%p)",
    tsconfigOptions => {
        jest.spyOn(process, "cwd").mockReturnValue(projectRoot);

        const config = {
            compilerOptions: { ...tsconfigOptions, types: [], skipLibCheck: true },
            tstl: { luaTarget: tstl.LuaTarget.LuaJIT, luaLibImport: tstl.LuaLibImportKind.Always },
        };

        const { fileNames, options } = tstl.updateParsedConfigFile(
            ts.parseJsonConfigFileContent(config, ts.sys, projectRoot)
        );

        const { diagnostics, emittedFiles } = transpileFilesResult(fileNames, options);
        expect(diagnostics).not.toHaveDiagnostics();
        expect(emittedFiles.map(f => f.name).sort()).toMatchSnapshot();
    }
);
