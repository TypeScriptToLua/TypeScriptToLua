import * as path from "path";
import * as util from "../util";
import { TranspileVirtualProjectResult } from "../../src";
import { lineAndColumnOf } from "../unit/printer/utils";
import * as fs from "fs";

describe("bundle two files", () => {
    const projectDir = path.join(__dirname, "bundle", "bundle-two-files");
    const inputProject = path.join(projectDir, "tsconfig.json");

    let transpileResult: TranspileVirtualProjectResult = {
        transpiledFiles: [],
        diagnostics: [],
    };

    beforeAll(() => {
        transpileResult = util.testProject(inputProject).getLuaResult();
    });

    test("should transpile into one file (with no errors)", () => {
        expect(transpileResult.diagnostics).not.toHaveDiagnostics();
        expect(transpileResult.transpiledFiles).toHaveLength(1);
    });

    // Verify the name is as specified in tsconfig
    test("should have name, specified in tsconfig.json", () => {
        const { outPath } = transpileResult.transpiledFiles[0];
        expect(outPath.endsWith(path.join(projectDir, "bundle.lua"))).toBe(true);
    });

    // Verify exported module by executing
    // Use an empty TS string because we already transpiled the TS project
    test("executing should act correctly", () => {
        const { lua } = transpileResult.transpiledFiles[0];
        util.testModule("").setLuaHeader(lua!).expectToEqual({ myNumber: 3 });
    });
});

describe("bundle with source maps", () => {
    const projectDir = path.join(__dirname, "bundle", "bundle-source-maps");
    const inputProject = path.join(projectDir, "tsconfig.json");

    let transpileResult: TranspileVirtualProjectResult = {
        transpiledFiles: [],
        diagnostics: [],
    };

    beforeAll(() => {
        transpileResult = util.testProject(inputProject).getLuaResult();
    });

    // See https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1109
    test('the result file should not contain "{#SourceMapTraceback}" macro-string', () => {
        const { lua } = transpileResult.transpiledFiles[0];
        expect(lua).not.toBeUndefined();
        expect(lua!).not.toContain("{#SourceMapTraceback}");
    });

    // Verify exported module by executing
    // Use an empty TS string because we already transpiled the TS project
    test("executing should act correctly", () => {
        const { lua } = transpileResult.transpiledFiles[0];
        const result = util.testModule("").setLuaHeader(lua!).getLuaExecutionResult();

        expect(result.myNumber).toEqual(3 * 4 * (5 + 6));
    });

    test("sourceMapTraceback saves correct sourcemap", () => {
        const code = {
            index: fs.readFileSync(path.join(projectDir, "index.ts"), "utf8"),
            largeFile: fs.readFileSync(path.join(projectDir, "largeFile.ts"), "utf8"),
        };

        const { lua } = transpileResult.transpiledFiles[0];
        const builder = util.testModule("").setLuaHeader(lua!);
        const result = builder.getLuaExecutionResult();
        const sourceMap = result.sourceMap;

        expect(sourceMap).toEqual(expect.any(Object));
        const sourceMapFiles = Object.keys(sourceMap);
        expect(sourceMapFiles).toHaveLength(1);
        const mainSourceMap = sourceMap[sourceMapFiles[0]];

        const transpiledLua = builder.getMainLuaCodeChunk();

        const assertPatterns: Array<{
            file: keyof typeof code;
            luaPattern: string;
            typeScriptPattern: string;
        }> = [
            {
                file: "index",
                luaPattern: "____exports.myNumber = getNumber(",
                typeScriptPattern: "const myNumber = getNumber(",
            },
            {
                file: "largeFile",
                luaPattern: "local Calculator = __TS__Class()",
                typeScriptPattern: "abstract class Calculator",
            },
            {
                file: "largeFile",
                luaPattern: "local CalculatorMul = __TS__Class()",
                typeScriptPattern: "class CalculatorMul extends Calculator {",
            },
            {
                file: "largeFile",
                luaPattern: "local function resolveCalculatorClass(",
                typeScriptPattern: "function resolveCalculatorClass(",
            },
            {
                file: "largeFile",
                luaPattern: "function ____exports.getNumber(",
                typeScriptPattern: "export function getNumber(",
            },
            {
                file: "largeFile",
                luaPattern: 'Error,\n            "Unknown operation "',
                typeScriptPattern: "throw new Error(",
            },
        ];

        for (const { file: currentFile, luaPattern, typeScriptPattern } of assertPatterns) {
            const luaPosition = lineAndColumnOf(transpiledLua, luaPattern);
            const mappedLine: { file: string; line: number } = mainSourceMap[luaPosition.line.toString()];

            const typescriptPosition = lineAndColumnOf(code[currentFile], typeScriptPattern);
            expect(mappedLine.line).toEqual(typescriptPosition.line);
            expect(mappedLine.file).toEqual(`${currentFile}.ts`);
        }
    });
});
