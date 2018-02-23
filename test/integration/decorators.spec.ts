import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class DecoratorTests {

    // Expect the passed lua string to be equal to the file's contents.
    private ExpectEqualToFile(lua: string, path: string) {
        const expected = fs.readFileSync(path).toString();
        Expect(lua).toBe(expected.trim().split("\r\n").join("\n"));
    }

    @Test("RegularEnum")
    public regularEnum() {
        const lua = util.transpileFile("test/integration/testfiles/enum.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/enum-expected.lua");
    }

    @Test("MembersOnlyEnumDecorator")
    public membersOnly() {
        const lua = util.transpileFile("test/integration/testfiles/enumMembersOnly.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/enumMembersOnly-expected.lua");
    }

    @Test("RegularClassExtend")
    public regularClassExtend() {
        const lua = util.transpileFile("test/integration/testfiles/class.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/class-expected.lua");
    }

    @Test("PureAbstractClassExtend")
    public pureAbstractClassExtend() {
        const lua = util.transpileFile("test/integration/testfiles/classPureAbstract.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classPureAbstract-expected.lua");
    }

    @Test("ExtensionClass")
    public extensionClass() {
        const lua = util.transpileFile("test/integration/testfiles/classExtension.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/classExtension-expected.lua");
    }

    @Test("RegularNamespace")
    public regularNamespace() {
        const lua = util.transpileFile("test/integration/testfiles/namespace.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/namespace-expected.lua");
    }

    @Test("PhantomNamespace")
    public phantomNamespace() {
        const lua = util.transpileFile("test/integration/testfiles/namespacePhantom.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/namespacePhantom-expected.lua");
    }
}
