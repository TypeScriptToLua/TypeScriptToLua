import * as ts from "typescript";
import { DecoratorKind } from "../../src/Decorator";
import { TSHelper as tsHelper } from "../../src/TSHelper";
import * as util from "../util";

enum TestEnum {
    testA = 1,
    testB = 2,
    testC = 4,
}

test.each([
    { inp: TestEnum.testA, expected: "testA" },
    { inp: -1, expected: "unknown" },
    { inp: TestEnum.testA | TestEnum.testB, expected: "unknown" },
])("EnumName (%p)", ({ inp, expected }) => {
    const result = tsHelper.enumName(inp, TestEnum);

    expect(result).toEqual(expected);
});

test.each([
    { inp: TestEnum.testA, expected: ["testA"] },
    { inp: -1, expected: [] },
    { inp: TestEnum.testA | TestEnum.testC, expected: ["testA", "testC"] },
    {
        inp: TestEnum.testA | TestEnum.testB | TestEnum.testC,
        expected: ["testA", "testB", "testC"],
    },
])("EnumNames (%p)", ({ inp, expected }) => {
    const result = tsHelper.enumNames(inp, TestEnum);

    expect(result).toEqual(expected);
});

test("GetCustomDecorators single", () => {
    const source = `
        /** @compileMembersOnly */
        enum TestEnum {
            val1 = 0,
            val2 = 2,
            val3,
            val4 = "bye",
        }

        const a = TestEnum.val1;
    `;

    const [sourceFile, typeChecker] = util.parseTypeScript(source);
    const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);

    if (identifier !== undefined) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(1);
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    } else {
        // Fail test
        expect(identifier).toBeDefined();
    }
});

test("GetCustomDecorators multiple", () => {
    const source = `
        /** @compileMembersOnly
        * @Phantom */
        enum TestEnum {
            val1 = 0,
            val2 = 2,
            val3,
            val4 = "bye",
        }

        const a = TestEnum.val1;
    `;

    const [sourceFile, typeChecker] = util.parseTypeScript(source);
    const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);

    if (identifier !== undefined) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(2);
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
        expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
    } else {
        // Fail test
        expect(identifier).toBeDefined();
    }
});

test("GetCustomDecorators single jsdoc", () => {
    const source = `
        /** @compileMembersOnly */
        enum TestEnum {
            val1 = 0,
            val2 = 2,
            val3,
            val4 = "bye",
        }

        const a = TestEnum.val1;
    `;

    const [sourceFile, typeChecker] = util.parseTypeScript(source);
    const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);

    if (identifier !== undefined) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(1);
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    } else {
        // Fail test
        expect(identifier).toBeDefined();
    }
});

test("GetCustomDecorators multiple jsdoc", () => {
    const source = `
        /** @phantom
        * @CompileMembersOnly */
        enum TestEnum {
            val1 = 0,
            val2 = 2,
            val3,
            val4 = "bye",
        }

        const a = TestEnum.val1;
    `;

    const [sourceFile, typeChecker] = util.parseTypeScript(source);
    const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);

    if (identifier !== undefined) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(2);
        expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    } else {
        // Fail test
        expect(identifier).toBeDefined();
    }
});

test("GetCustomDecorators multiple default jsdoc", () => {
    const source = `
        /**
        * @description abc
        * @phantom
        * @compileMembersOnly */
        enum TestEnum {
            val1 = 0,
            val2 = 2,
            val3,
            val4 = "bye",
        }

        const a = TestEnum.val1;
    `;

    const [sourceFile, typeChecker] = util.parseTypeScript(source);
    const identifier = util.findFirstChild(sourceFile, ts.isEnumDeclaration);

    if (identifier !== undefined) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(2);
        expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    } else {
        // Fail test
        expect(identifier).toBeDefined();
    }
});
