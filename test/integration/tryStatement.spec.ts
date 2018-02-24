import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class NamespaceTests {

    // Expect the passed lua string to be equal to the file's contents.
    private ExpectEqualToFile(lua: string, path: string) {
        const expected = fs.readFileSync(path).toString();
        Expect(lua).toBe(expected.trim().split("\r\n").join("\n"));
    }

    @Test("TryCatch")
    public tryCatch() {
        const lua = util.transpileFile("test/integration/testfiles/tryCatch.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/tryCatch.lua");
    }

    @Test("TryFinally")
    public tryFinally() {
        const lua = util.transpileFile("test/integration/testfiles/tryFinally.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/tryFinally.lua");
    }

    @Test("TryCatchFinally")
    public tryCatchFinally() {
        const lua = util.transpileFile("test/integration/testfiles/tryCatchFinally.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/tryCatchFinally.lua");
    }
}
