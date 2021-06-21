import * as path from "path";
import * as ts from "typescript";
import { getSourceDir } from "../../src";
import * as util from "../util";

const cwd = process.cwd();

// Path for project tsconfig.json to resolve for
const configFilePath = path.join(cwd, "tsconfig.json");

describe("getSourceDir", () => {
    test("with rootDir", () => {
        const program = ts.createProgram(["main.ts", "src/otherfile.ts"], { configFilePath, rootDir: "src" });

        // getCommonSourceDirectory does not work right so mock it
        jest.spyOn(program, "getCommonSourceDirectory").mockReturnValue(cwd);

        expect(getSourceDir(program)).toBe(path.join(cwd, "src"));
    });

    test("without rootDir", () => {
        const program = ts.createProgram(["main.ts", "src/otherfile.ts"], { configFilePath });

        // getCommonSourceDirectory does not work right so mock it
        jest.spyOn(program, "getCommonSourceDirectory").mockReturnValue(cwd);

        // Common sources directory is project root
        expect(normalize(getSourceDir(program))).toBe(cwd);
    });

    test("without rootDir in src dir", () => {
        const program = ts.createProgram([path.join(cwd, "src", "main.ts"), path.join(cwd, "src", "otherfile.ts")], {
            configFilePath,
        });

        // getCommonSourceDirectory does not work right so mock it
        jest.spyOn(program, "getCommonSourceDirectory").mockReturnValue(path.join(cwd, "src"));

        // Common sources directory is src
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
});

function normalize(path: string) {
    return path.endsWith("/") ? path.slice(0, path.length - 1) : path;
}
