import * as tstl from "../../../src";
import { unsupportedProperty } from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

describe("luaLibImport", () => {
    test("inline", () => {
        util.testExpression`[0].indexOf(1)`
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.Inline })
            .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toContain('require("lualib_bundle")'))
            .expectToMatchJsResult();
    });

    test("require", () => {
        util.testExpression`[0].indexOf(1)`
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.Require })
            .tap(builder => expect(builder.getMainLuaCodeChunk()).toContain('require("lualib_bundle")'))
            .expectToMatchJsResult();
    });

    function testLualibOnlyHasArrayIndexOf(builder: util.TestBuilder) {
        const lualibBundle = builder.getLuaResult().transpiledFiles.find(f => f.outPath.endsWith("lualib_bundle.lua"))!;
        expect(lualibBundle).toBeDefined();
        expect(lualibBundle.lua).toEqual(expect.stringMatching("^local function __TS__ArrayIndexOf"));
        expect(lualibBundle.lua).not.toContain("__TS__ArrayConcat");
        expect(lualibBundle.lua).not.toContain("Error");
    }

    test("require-minimal", () => {
        util.testExpression`[0].indexOf(1)`
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.RequireMinimal })
            .tap(builder => expect(builder.getMainLuaCodeChunk()).toContain('require("lualib_bundle")'))
            .tap(testLualibOnlyHasArrayIndexOf)
            .expectToMatchJsResult();
    });

    test("require-minimal with lualib in another file", () => {
        util.testModule`
            import "./other";
        `
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.RequireMinimal })
            .addExtraFile(
                "other.lua",
                `
local ____lualib = require("lualib_bundle")
local __TS__ArrayIndexOf = ____lualib.__TS__ArrayIndexOf
__TS__ArrayIndexOf({}, 1)
            `
            )
            // note: indent matters in above code, because searching for lualib checks for start & end of line
            .tap(testLualibOnlyHasArrayIndexOf)
            .expectNoExecutionError();
    });
});

test.each([
    tstl.LuaLibImportKind.Inline,
    tstl.LuaLibImportKind.None,
    tstl.LuaLibImportKind.Require,
    tstl.LuaLibImportKind.RequireMinimal,
])("should not include lualib without code (%p)", luaLibImport => {
    util.testModule``.setOptions({ luaLibImport }).tap(builder => expect(builder.getMainLuaCodeChunk()).toBe(""));
});

test("lualib should not include tstl header", () => {
    util.testExpression`[0].indexOf(1)`.tap(builder =>
        expect(builder.getMainLuaCodeChunk()).not.toContain("Generated with")
    );
});

describe("Unknown builtin property", () => {
    test("access", () => {
        util.testExpression`Math.unknownProperty`
            .disableSemanticCheck()
            .expectDiagnosticsToMatchSnapshot([unsupportedProperty.code]);
    });
});
