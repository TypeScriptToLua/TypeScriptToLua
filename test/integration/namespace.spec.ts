import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class NamespaceTests {

    // Expect the passed lua string to be equal to the file's contents.
    private ExpectEqualToFile(lua: string, path: string) {
        const expected = fs.readFileSync(path).toString();
        Expect(lua).toBe(expected.trim().split("\r\n").join("\n"));
    }

    @Test("RegularNamespace")
    public regularNamespace() {
        const lua = util.transpileFile("test/integration/testfiles/namespace.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/namespace.lua");
    }

    @Test("NestedNamespace")
    public nestedNamespace() {
        const lua = util.transpileFile("test/integration/testfiles/namespaceNested.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/namespaceNested.lua");
    }


    @Test("NamespaceCall")
    public namespaceCall() {
        const lua = util.transpileFile("test/integration/testfiles/callNamespace.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/callNamespace.lua");
    }
}
