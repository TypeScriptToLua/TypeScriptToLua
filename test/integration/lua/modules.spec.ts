import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util"

const dedent = require('dedent')

export class LuaLoopTests {

    @TestCase(
        `export function publicFunc() {}`,

        `local exports = exports or {}
        local function publicFunc()
        end
        exports.publicFunc = publicFunc
        return exports`
    )
    @TestCase(
        `function publicFunc() {}`,

        `function publicFunc()
        end`
    )
    @TestCase(
        `export const test = "test"`,

        `local exports = exports or {}
        local test = "test"
        exports.test = test

        return exports`
    )
    @TestCase(
        `const test = "test"`,

        `local test = "test"`
    )
    @TestCase(
        `import {TestClass} from "test"`,

        `local test0 = require("test")
        local TestClass = test0.TestClass`
    )
    @TestCase(
        `import {TestClass as RenamedClass} from "test"`,

        `local test0 = require("test")
        local RenamedClass = test0.TestClass`
    )
    @TestCase(
        `namespace TestSpace {}`,
        `TestSpace = TestSpace or {}
        exports.TestSpace = exports.TestSpace or {}
        do
        end`
    )
    @Test("modules")
    public modules<T>(inp: string, expected: string) {
        // Transpile
        let lua = util.transpileString(inp, util.dummyTypes.Object);

        // Assert
        // Dont test for correct indention this allows easier tes case definition
        Expect(dedent(lua)).toBe(dedent(expected));
    }
}
