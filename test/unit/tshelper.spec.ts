import * as ts from "typescript";

import { Expect, FocusTest, IgnoreTest, Test, TestCase } from "alsatian";
import { TSHelper as tsEx } from "../../src/TSHelper";

enum TestEnum {
    testA = 1,
    testB = 2,
    testC = 4,
}

export class TSHelperTests {

    @TestCase(TestEnum.testA, "testA")
    @TestCase(-1, "unknown")
    @TestCase(TestEnum.testA | TestEnum.testB, "unknown")
    @Test("EnumName")
    public testEnumName(inp, expected) {
        const result = tsEx.enumName(inp, TestEnum);

        Expect(result).toEqual(expected);
    }

    @TestCase(TestEnum.testA, ["testA"])
    @TestCase(-1, [])
    @TestCase(TestEnum.testA | TestEnum.testC, ["testA", "testC"])
    @TestCase(TestEnum.testA | TestEnum.testB | TestEnum.testC, ["testA", "testB", "testC"])
    @Test("EnumNames")
    public testEnumNames(inp, expected) {
        const result = tsEx.enumNames(inp, TestEnum);

        Expect(result).toEqual(expected);
    }

    @Test("IsFileModuleNull")
    public isFileModuleNull() {
        Expect(tsEx.isFileModule(null)).toEqual(false);
    }
}
