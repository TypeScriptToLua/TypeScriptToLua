import * as tstl from "../../../src";
import * as TSTLErrors from "../../../src/TSTLErrors";
import * as util from "../../util";

describe("luaLibImport", () => {
    test("require", () => {
        util.testExpression`b instanceof c`
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.Require })
            .disableSemanticCheck()
            .tap(builder => expect(builder.getMainLuaCodeChunk()).toContain(`require("lualib_bundle")`));
    });

    test("always", () => {
        util.testModule``
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.Always })
            .tap(builder => expect(builder.getMainLuaCodeChunk()).toContain(`require("lualib_bundle")`));
    });

    test("inline", () => {
        util.testExpression`new Map().size`
            .setOptions({ luaLibImport: tstl.LuaLibImportKind.Inline })
            .expectToMatchJsResult();
    });
});

test.each([tstl.LuaLibImportKind.Inline, tstl.LuaLibImportKind.None, tstl.LuaLibImportKind.Require])(
    "LuaLib no uses? No code (%p)",
    luaLibImport => {
        util.testModule``.setOptions({ luaLibImport }).tap(builder => expect(builder.getMainLuaCodeChunk()).toBe(""));
    }
);

test("lualibs should not include tstl header", () => {
    util.testModule`
        const arr = [1, 2, 3];
        arr.push(4);
    `.tap(builder => expect(builder.getMainLuaCodeChunk()).not.toContain("Generated with"));
});

test("Incompatible fromCodePoint expression error", () => {
    util.testExpression`String.fromCodePoint(123)`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(
            TSTLErrors.UnsupportedForTarget("string property fromCodePoint", tstl.LuaTarget.Lua53, util.nodeStub)
        );
});

test("Unknown string expression error", () => {
    util.testExpression`String.abcd()`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(
            TSTLErrors.UnsupportedForTarget("string property abcd", tstl.LuaTarget.Lua53, util.nodeStub)
        );
});

test("Unsupported array function error", () => {
    util.testFunction`[].unknownFunction()`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(TSTLErrors.UnsupportedProperty("array", "unknownFunction", util.nodeStub));
});

test("Unsupported math property error", () => {
    util.testExpression`Math.unknownProperty`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(TSTLErrors.UnsupportedProperty("math", "unknownProperty", util.nodeStub));
});
