import { Expect, Test, TestCase } from "alsatian";
import { TSHelper as tsHelper } from "../../src/TSHelper";

import * as ts from "typescript";
import * as util from "../src/util";

import { DecoratorKind } from "../../src/Decorator";

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
    public testEnumName(inp, expected): void {
        const result = tsHelper.enumName(inp, TestEnum);

        Expect(result).toEqual(expected);
    }

    @TestCase(TestEnum.testA, ["testA"])
    @TestCase(-1, [])
    @TestCase(TestEnum.testA | TestEnum.testC, ["testA", "testC"])
    @TestCase(TestEnum.testA | TestEnum.testB | TestEnum.testC, ["testA", "testB", "testC"])
    @Test("EnumNames")
    public testEnumNames(inp, expected): void {
        const result = tsHelper.enumNames(inp, TestEnum);

        Expect(result).toEqual(expected);
    }

    @Test("IsFileModuleNull")
    public isFileModuleNull(): void {
        Expect(tsHelper.isFileModule(undefined)).toEqual(false);
    }

    @Test("GetCustomDecorators single")
    public GetCustomDecoratorsSingle(): void {
        const source = `/** @compileMembersOnly */
            enum TestEnum {
                val1 = 0,
                val2 = 2,
                val3,
                val4 = "bye",
            }

            const a = TestEnum.val1;`;

        const [sourceFile, typeChecker] = util.parseTypeScript(source);
        const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        Expect(decorators.size).toBe(1);
        Expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    }

    @Test("GetCustomDecorators multiple")
    public GetCustomDecoratorsMultiple(): void {
        const source = `/** @compileMembersOnly
            * @Phantom */
            enum TestEnum {
                val1 = 0,
                val2 = 2,
                val3,
                val4 = "bye",
            }

            const a = TestEnum.val1;`;

        const [sourceFile, typeChecker] = util.parseTypeScript(source);
        const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        Expect(decorators.size).toBe(2);
        Expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
        Expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
    }

    @Test("GetCustomDecorators single jsdoc")
    public GetCustomDecoratorsSingleJSDoc(): void {
        const source = `/** @compileMembersOnly */
            enum TestEnum {
                val1 = 0,
                val2 = 2,
                val3,
                val4 = "bye",
            }

            const a = TestEnum.val1;`;

        const [sourceFile, typeChecker] = util.parseTypeScript(source);
        const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        Expect(decorators.size).toBe(1);
        Expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    }

    @Test("GetCustomDecorators multiple jsdoc")
    public GetCustomDecoratorsMultipleJSDoc(): void {
        const source = `/** @phantom
            * @CompileMembersOnly */
            enum TestEnum {
                val1 = 0,
                val2 = 2,
                val3,
                val4 = "bye",
            }

            const a = TestEnum.val1;`;

        const [sourceFile, typeChecker] = util.parseTypeScript(source);
        const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        Expect(decorators.size).toBe(2);
        Expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
        Expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    }

    @Test("GetCustomDecorators multiple default jsdoc")
    public GetCustomDecoratorsMultipleDefaultJSDoc(): void {
        const source = `/**
            * @description abc
            * @phantom
            * @compileMembersOnly */
            enum TestEnum {
                val1 = 0,
                val2 = 2,
                val3,
                val4 = "bye",
            }

            const a = TestEnum.val1;`;

        const [sourceFile, typeChecker] = util.parseTypeScript(source);
        const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        Expect(decorators.size).toBe(2);
        Expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
        Expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    }
}
