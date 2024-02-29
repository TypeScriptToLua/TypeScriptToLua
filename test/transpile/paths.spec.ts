import * as path from "path";
import * as ts from "typescript";
import { getEmitPath, getSourceDir } from "../../src";
import * as util from "../util";

const cwd = process.cwd();

// Path for project tsconfig.json to resolve for
const configFilePath = path.join(cwd, "tsconfig.json");

describe("getSourceDir", () => {
    test("with rootDir", () => {
        const program = ts.createProgram(["main.ts", "src/otherfile.ts"], { configFilePath, rootDir: "src" });

        // If rootdir is specified, rootDir is the sourceDir
        expect(getSourceDir(program)).toBe(path.join(cwd, "src"));
    });

    test("without rootDir", () => {
        const program = ts.createProgram(["main.ts", "src/otherfile.ts"], { configFilePath });

        // If rootDir is not specified, root dir is where the config file is
        expect(normalize(getSourceDir(program))).toBe(cwd);
    });

    test("without config file in src dir", () => {
        const program = ts.createProgram([path.join(cwd, "src", "main.ts"), path.join(cwd, "src", "otherfile.ts")], {});

        // getCommonSourceDirectory does not work right so mock it
        jest.spyOn(program, "getCommonSourceDirectory").mockReturnValue(path.join(cwd, "src"));

        // If there is no config file, return the common source directory
        expect(normalize(getSourceDir(program))).toBe(path.join(cwd, "src"));
    });
});

describe("getEmitPath", () => {
    test("puts files next to input without options", () => {
        const { transpiledFiles } = util.testModule``
            .setMainFileName("main.ts")
            .addExtraFile("dir/extra.ts", "")
            .expectToHaveNoDiagnostics()
            .getLuaResult();

        const fileNames = transpiledFiles.map(f => f.outPath);
        expect(fileNames).toContain("main.lua");
        expect(fileNames).toContain(path.join("dir", "extra.lua"));
    });

    test("puts files in outdir", () => {
        const outDir = path.join(cwd, "tstl-out");
        const { transpiledFiles } = util.testModule``
            .setMainFileName("main.ts")
            .addExtraFile("dir/extra.ts", "")
            .setOptions({ outDir })
            .expectToHaveNoDiagnostics()
            .getLuaResult();

        const fileNames = transpiledFiles.map(f => f.outPath);
        expect(fileNames).toContain(path.join(outDir, "main.lua"));
        expect(fileNames).toContain(path.join(outDir, "dir", "extra.lua"));
    });

    test("puts files from rootDir in outdir", () => {
        const outDir = path.join(cwd, "tstl-out");
        const { transpiledFiles } = util.testModule``
            .setMainFileName("src/main.ts")
            .addExtraFile("src/extra.ts", "")
            .setOptions({ rootDir: "src", outDir })
            .expectToHaveNoDiagnostics()
            .getLuaResult();

        const fileNames = transpiledFiles.map(f => f.outPath);
        expect(fileNames).toContain(path.join(outDir, "main.lua"));
        expect(fileNames).toContain(path.join(outDir, "extra.lua"));
    });

    test("puts bundle relative to project root", () => {
        const { transpiledFiles } = util.testModule``
            .setMainFileName("src/main.ts")
            .addExtraFile("src/extra.ts", "")
            .setOptions({ configFilePath, rootDir: "src", luaBundle: "out/bundle.lua", luaBundleEntry: "src/main.ts" })
            .expectToHaveNoDiagnostics()
            .getLuaResult();

        const fileNames = transpiledFiles.map(f => f.outPath);
        expect(fileNames).toHaveLength(1);
        expect(fileNames).toContain(path.join(cwd, "out", "bundle.lua"));
    });

    test("puts bundle relative to outdir", () => {
        const { transpiledFiles } = util.testModule``
            .setMainFileName("src/main.ts")
            .addExtraFile("src/extra.ts", "")
            .setOptions({
                configFilePath,
                rootDir: "src",
                outDir: "out1",
                luaBundle: "out2/bundle.lua",
                luaBundleEntry: "src/main.ts",
            })
            .expectToHaveNoDiagnostics()
            .getLuaResult();

        const fileNames = transpiledFiles.map(f => f.outPath);
        expect(fileNames).toHaveLength(1);
        expect(fileNames).toContain(path.join(cwd, "out1", "out2", "bundle.lua"));
    });

    test.each([".scar", "scar"])("uses config extension (%p)", extension => {
        const { transpiledFiles } = util.testModule``
            .setMainFileName("main.ts")
            .addExtraFile("dir/extra.ts", "")
            .setOptions({ extension })
            .expectToHaveNoDiagnostics()
            .getLuaResult();

        const fileNames = transpiledFiles.map(f => f.outPath);
        expect(fileNames).toContain("main.scar");
        expect(fileNames).toContain(path.join("dir", "extra.scar"));
    });

    test("bundle with different extension", () => {
        const { transpiledFiles } = util.testModule``
            .setMainFileName("src/main.ts")
            .addExtraFile("src/extra.ts", "")
            .setOptions({
                configFilePath,
                rootDir: "src",
                outDir: "out1",
                luaBundle: "out2/bundle.scar",
                luaBundleEntry: "src/main.ts",
            })
            .expectToHaveNoDiagnostics()
            .getLuaResult();

        const fileNames = transpiledFiles.map(f => f.outPath);
        expect(fileNames).toHaveLength(1);
        expect(fileNames).toContain(path.join(cwd, "out1", "out2", "bundle.scar"));
    });

    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1540
    test("puts files next to their source if no config is given (#1540)", () => {
        const file1 = path.join("src", "main.ts");
        const file2 = path.join("src", "otherfile.ts");
        const file3 = path.join("src", "nested", "nestedfile.ts");
        const program = ts.createProgram([file1, file2, file3], { configFilePath });

        // If rootDir is not specified, root dir is where the config file is
        const configRoot = path.dirname(configFilePath);
        const replaceExtension = (f: string) => f.replace(/\.ts$/, ".lua");
        expect(getEmitPath(file1, program)).toBe(replaceExtension(path.join(configRoot, file1)));
        expect(getEmitPath(file2, program)).toBe(replaceExtension(path.join(configRoot, file2)));
        expect(getEmitPath(file3, program)).toBe(replaceExtension(path.join(configRoot, file3)));
    });
});

function normalize(path: string) {
    return path.endsWith("/") ? path.slice(0, path.length - 1) : path;
}
