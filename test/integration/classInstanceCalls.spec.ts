import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class ClassInstanceCallTests {

    // Expect the passed lua string to be equal to the file's contents.
    private ExpectEqualToFile(lua: string, path: string) {
        const expected = fs.readFileSync(path).toString();
        Expect(lua).toBe(expected.trim().split("\r\n").join("\n"));
    }

    @Test("emptyMemberCall1")
    public emptyMemberCall1() {
        const lua = util.transpileFile("test/integration/testfiles/classInstanceCall1.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classInstanceCall.lua");
    }

    @Test("emptyMemberCall2")
    public emptyMemberCall2() {
        const lua = util.transpileFile("test/integration/testfiles/classInstanceCall2.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classInstanceCall.lua");
    }

    @Test("emptyMemberCall3")
    public emptyMemberCall3() {
        const lua = util.transpileFile("test/integration/testfiles/classInstanceCall3.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classInstanceCall.lua");
    }

    @Test("userClassMemberCall")
    public userClassMemberCall() {
        const lua = util.transpileFile("test/integration/testfiles/classInstanceCall4.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classInstanceCall4.lua");
    }

    @Test("aliasCastCall")
    public aliasCastCall() {
        const lua = util.transpileFile("test/integration/testfiles/aliasCastCall.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/aliasCall.lua");
    }

    @Test("aliasAsCall")
    public aliasAsCall() {
        const lua = util.transpileFile("test/integration/testfiles/aliasAsCall.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/aliasCall.lua");
    }
}