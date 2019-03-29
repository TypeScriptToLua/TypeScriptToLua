import * as util from "../util";
import { LuaLibImportKind } from "../../src/CompilerOptions";

test("sourceMapTraceback saves sourcemap in _G", () => {
    const typeScriptSource = `
        function abc() {
            return "foo";
        }
        return JSONStringify(_G.__TS__sourcemap);`;

    const options = {sourceMapTraceback: true, luaLibImport: LuaLibImportKind.Inline};

    const transpiledLua = util.transpileString(typeScriptSource, options);

    const sourceMapJson = util.transpileAndExecute(
        typeScriptSource,
        options,
        undefined,
        "declare const _G: {__TS__sourcemap: any};"
    );

    expect(sourceMapJson).toBeDefined();

    const sourceMap = JSON.parse(sourceMapJson);

    const sourceMapFiles = Object.keys(sourceMap);

    expect(sourceMapFiles.length).toBe(1);
    expect(sourceMap[sourceMapFiles[0]]).toBeDefined();

    expectCorrectMapping(typeScriptSource, transpiledLua, sourceMap[sourceMapFiles[0]], [
        ["function abc()", "abc = function("],
        ["return \"foo\"", "return \"foo\""]
    ]);
});

// Helper functions

function expectCorrectMapping(
    original: string,
    lua: string,
    sourceMap: {[line: string]: number},
    patterns: Array<[string, string]>
): void {
    for (const [tsPattern, luaPattern] of patterns) {
        const originalLine = lineOf(original, "function abc()") + 1; // Add 1 for util-added header
        const luaLine = lineOf(lua, "abc = function(");
        const mappedLuaLine = sourceMap[luaLine.toString()];

        expect(mappedLuaLine).toBe(originalLine);
    }
}

// Find the line of the first occurrence of a pattern.
function lineOf(text: string, pattern: string): number {
    const pos = text.indexOf(pattern);
    if (pos === -1) {
        return pos;
    }

    const lineLengths = text.split("\n").map(s => s.length);

    let totalPos = 0;
    for (let line = 1; line <= lineLengths.length; line++) {
        // Add length of the line + 1 for the removed \n
        totalPos += lineLengths[line - 1] + 1;
        if (pos < totalPos) {
            return line;
        }
    }

    return -1;
}