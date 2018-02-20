import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";

export class DecoratorTests {

    @Test("RegularEnum")
    public regularEnum() {
        const lua = util.transpileFile("test/integration/testfiles/enum.ts");
        Expect(lua).toBe(
            "TestEnum={}\n"+
            "TestEnum.val1=0\n"+
            "TestEnum.val2=2\n"+
            "TestEnum.val3=3"
        );
    }

    @Test("MembersOnlyEnumDecorator")
    public membersOnly() {
        const lua = util.transpileFile("test/integration/testfiles/membersOnlyEnum.ts");
        Expect(lua).toBe(
            "val1=0\n"+
            "val2=2\n"+
            "val3=3"
        );
    }
}