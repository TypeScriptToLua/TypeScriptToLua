import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class ClassConstruction {

    // Expect the passed lua string to be equal to the file's contents.
    private ExpectEqualToFile(lua: string, path: string) {
        const expected = fs.readFileSync(path).toString();
        Expect(lua).toBe(expected.trim().split("\r\n").join("\n"));
    }

    @Test("ClassEmptyConstructor")
    public classEmptyConstructor() {
        const lua = util.transpileFile("test/integration/testfiles/classEmptyConstructor.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classEmptyConstructor.lua");
    }

    @Test("ClassRegularConstructor")
    public classRegularConstructor() {
        const lua = util.transpileFile("test/integration/testfiles/classRegularConstructor.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classRegularConstructor.lua");
    }
}
