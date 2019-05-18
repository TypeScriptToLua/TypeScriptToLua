import * as ts from "typescript";
import { DecoratorKind } from "../../src/Decorator";
import { TSHelper as tsHelper } from "../../src/TSHelper";
import * as util from "../util";

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

    if (util.expectToBeDefined(identifier)) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(1);
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
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

    if (util.expectToBeDefined(identifier)) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(2);
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
        expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
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

    if (util.expectToBeDefined(identifier)) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(1);
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
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

    if (util.expectToBeDefined(identifier)) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(2);
        expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
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

    if (util.expectToBeDefined(identifier)) {
        const enumType = typeChecker.getTypeAtLocation(identifier);

        const decorators = tsHelper.getCustomDecorators(enumType, typeChecker);

        expect(decorators.size).toBe(2);
        expect(decorators.has(DecoratorKind.Phantom)).toBeTruthy();
        expect(decorators.has(DecoratorKind.CompileMembersOnly)).toBeTruthy();
    }
});
