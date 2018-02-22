import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util"

const dedent = require('dedent')

export class LuaModuleTests {

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
        `import * as Test from "test"`,

        `local Test = require("test")`
    )
    @TestCase(
        `import {TestClass as RenamedClass} from "test"`,

        `local test0 = require("test")
        local RenamedClass = test0.TestClass`
    )
    @TestCase(
        `export class TestClass {}`,

        `local exports = exports or {}
        local TestClass = TestClass or {}
        exports.TestClass = TestClass
        TestClass.__index = TestClass
        function TestClass.new(construct, ...)
        local instance = setmetatable({}, TestClass)
        if construct and TestClass.constructor then TestClass.constructor(instance, ...) end
        return instance
        end
        return exports`
    )
    @TestCase(
        `export class TestClass {
            memberFunc() {}
        }`,

        `local exports = exports or {}
        local TestClass = TestClass or {}
        exports.TestClass = TestClass
        TestClass.__index = TestClass
        function TestClass.new(construct, ...)
        local instance = setmetatable({}, TestClass)
        if construct and TestClass.constructor then TestClass.constructor(instance, ...) end
        return instance
        end
        function TestClass.memberFunc(self)
        end
        return exports`
    )
    @TestCase(
        `namespace TestSpace {}`,

        `TestSpace = TestSpace or {}
        do
        end`
    )
    @TestCase(
        `export namespace TestSpace {}`,

        `local exports = exports or {}
        local TestSpace = TestSpace or {}
        exports.TestSpace = TestSpace
        do
        end
        return exports`
    )
    @TestCase(
        `export namespace TestSpace {
            function innerFunc() {}
        }`,

        `local exports = exports or {}
        local TestSpace = TestSpace or {}
        exports.TestSpace = TestSpace
        do
        local function innerFunc()
        end
        TestSpace.innerFunc = innerFunc
        end
        return exports`
    )
    @TestCase(
        `export namespace TestSpace {
            export function innerFunc() {}
        }`,

        `local exports = exports or {}
        local TestSpace = TestSpace or {}
        exports.TestSpace = TestSpace
        do
        local function innerFunc()
        end
        exports.TestSpace.innerFunc = innerFunc
        TestSpace.innerFunc = innerFunc
        end
        return exports`
    )
    @Test("modules")
    public modules(inp: string, expected: string) {
        // Transpile
        let lua = util.transpileString(inp, util.dummyTypes.Object);

        // Assert
        // Dont test for correct indention this allows easier test case definition
        Expect(dedent(lua)).toBe(dedent(expected));
    }

    @Test("defaultImport")
    public defaultImport() {
        Expect(() => {
            let lua = util.transpileString(`import TestClass from "test"`, util.dummyTypes.Object);
        }).toThrowError(Error, "Default Imports are not supported, please use named imports instead!");
    }
}
