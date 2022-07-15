import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import { LuaTarget } from "../../../src";
import { unsupportedForTarget, invalidCallExtensionUse } from "../../../src/transformation/utils/diagnostics";

const operatorsProjectOptions: tstl.CompilerOptions = {
    luaTarget: LuaTarget.Lua54,
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

const operatorMapTestObject = `
    class OpTest {
        public value: number;
        public constructor(value: number) { this.value = value; }

        public __add(other: OpTest): OpTest;
        public __add(other: number): number;
        public __add(other: OpTest | number) {
            if (typeof other === "number") {
                return this.value + other;
            } else {
                return new OpTest(this.value + other.value);
            }
        }
        public __sub(other: OpTest) { return new OpTest(this.value - other.value); }
        public __mul(other: OpTest) { return new OpTest(this.value * other.value); }
        public __div(other: OpTest) { return new OpTest(this.value / other.value); }
        public __mod(other: OpTest) { return new OpTest(this.value % other.value); }
        public __pow(other: OpTest) { return new OpTest(this.value ** other.value); }
        public __idiv(other: OpTest) { return new OpTest(Math.floor(this.value / other.value)); }
        public __band(other: OpTest) { return new OpTest(this.value & other.value); }
        public __bor(other: OpTest) { return new OpTest(this.value | other.value); }
        public __bxor(other: OpTest) { return new OpTest(this.value ^ other.value); }
        public __shl(other: OpTest) { return new OpTest(this.value << other.value); }
        public __shr(other: OpTest) { return new OpTest(this.value >>> other.value); }

        public __lt(other: OpTest) { return this.value < other.value; }
        public __gt(other: OpTest) { return this.value > other.value; }

        public __concat(other: OpTest) { return this.value.toString() + other.value.toString(); }

        public __unm() { return -this.value; }
        public __bnot() { return ~this.value; }
        public __len() { return this.value; }
    }
`;

const binaryMathOperatorTests: Array<{ opType: string; left: number; right: number; expectResult: number }> = [
    { opType: "LuaAddition", left: 7, right: 4, expectResult: 11 },
    { opType: "LuaSubtraction", left: 7, right: 4, expectResult: 3 },
    { opType: "LuaMultiplication", left: 7, right: 4, expectResult: 28 },
    { opType: "LuaDivision", left: 7, right: 4, expectResult: 1.75 },
    { opType: "LuaModulo", left: 7, right: 4, expectResult: 3 },
    { opType: "LuaPower", left: 7, right: 4, expectResult: 2401 },
    { opType: "LuaFloorDivision", left: 7, right: 4, expectResult: 1 },
    { opType: "LuaBitwiseAnd", left: 6, right: 5, expectResult: 4 },
    { opType: "LuaBitwiseOr", left: 6, right: 5, expectResult: 7 },
    { opType: "LuaBitwiseExclusiveOr", left: 6, right: 5, expectResult: 3 },
    { opType: "LuaBitwiseLeftShift", left: 7, right: 2, expectResult: 28 },
    { opType: "LuaBitwiseRightShift", left: 7, right: 2, expectResult: 1 },
];

test.each(binaryMathOperatorTests)(
    "binary math operator mapping - global function (%s)",
    ({ opType, left, right, expectResult }) => {
        util.testModule`
        ${operatorMapTestObject}
        declare const op: ${opType}<OpTest, OpTest, OpTest>;
        const left = new OpTest(${left});
        const right = new OpTest(${right});
        export const result = op(left, right).value;
    `
            .setOptions(operatorsProjectOptions)
            .setReturnExport("result")
            .expectToEqual(expectResult);
    }
);

test.each(binaryMathOperatorTests)(
    "binary math operator mapping - static function (%s)",
    ({ opType, left, right, expectResult }) => {
        util.testModule`
        ${operatorMapTestObject}
        declare namespace OpTest {
            export const op: ${opType}<OpTest, OpTest, OpTest>;
        }
        const left = new OpTest(${left});
        const right = new OpTest(${right});
        export const result = OpTest.op(left, right).value;
    `
            .setOptions(operatorsProjectOptions)
            .setReturnExport("result")
            .expectToEqual(expectResult);
    }
);

test.each(binaryMathOperatorTests)(
    "binary math operator mapping - method (%s)",
    ({ opType, left, right, expectResult }) => {
        util.testModule`
        ${operatorMapTestObject}
        declare interface OpTest {
            op: ${opType}Method<OpTest, OpTest>;
        }
        const left = new OpTest(${left});
        const right = new OpTest(${right});
        export const result = left.op(right).value;
    `
            .setOptions(operatorsProjectOptions)
            .setReturnExport("result")
            .expectToEqual(expectResult);
    }
);

const luaTargetsPre53 = [LuaTarget.Lua51, LuaTarget.Lua52, LuaTarget.LuaJIT, LuaTarget.Universal];

const operatorTypesPost53 = [
    "LuaFloorDivision",
    "LuaBitwiseAnd",
    "LuaBitwiseOr",
    "LuaBitwiseExclusiveOr",
    "LuaBitwiseLeftShift",
    "LuaBitwiseRightShift",
];

test.each(luaTargetsPre53.flatMap(target => operatorTypesPost53.map(opType => [target, opType] as const)))(
    "unsupported binary operator mapping (%s %s)",
    (luaTarget, opType) => {
        util.testModule`
        declare interface OpTest { value: number; }
        declare const op: ${opType}<OpTest, OpTest, OpTest>;
        declare const left: OpTest;
        declare const right: OpTest;
        op(left, right);
    `
            .setOptions({ ...operatorsProjectOptions, luaTarget })
            .expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]);
    }
);

const comparisonOperatorTests: Array<{ opType: string; left: number; right: number; expectResult: boolean }> = [
    { opType: "LuaLessThan", left: 7, right: 4, expectResult: false },
    { opType: "LuaLessThan", left: 4, right: 7, expectResult: true },
    { opType: "LuaGreaterThan", left: 7, right: 4, expectResult: true },
    { opType: "LuaGreaterThan", left: 4, right: 7, expectResult: false },
];

test.each(comparisonOperatorTests)(
    "comparison operator mapping - global function (%s)",
    ({ opType, left, right, expectResult }) => {
        util.testModule`
        ${operatorMapTestObject}
        declare const op: ${opType}<OpTest, OpTest, boolean>;
        const left = new OpTest(${left});
        const right = new OpTest(${right});
        export const result = op(left, right);
    `
            .setOptions(operatorsProjectOptions)
            .setReturnExport("result")
            .expectToEqual(expectResult);
    }
);

test.each(comparisonOperatorTests)(
    "comparison operator mapping - static function (%s)",
    ({ opType, left, right, expectResult }) => {
        util.testModule`
        ${operatorMapTestObject}
        declare namespace OpTest {
            export const op: ${opType}<OpTest, OpTest, boolean>;
        }
        const left = new OpTest(${left});
        const right = new OpTest(${right});
        export const result = OpTest.op(left, right);
    `
            .setOptions(operatorsProjectOptions)
            .setReturnExport("result")
            .expectToEqual(expectResult);
    }
);

test.each(comparisonOperatorTests)(
    "comparison operator mapping - method (%s)",
    ({ opType, left, right, expectResult }) => {
        util.testModule`
        ${operatorMapTestObject}
        declare interface OpTest {
            op: ${opType}Method<OpTest, boolean>;
        }
        const left = new OpTest(${left});
        const right = new OpTest(${right});
        export const result = left.op(right);
    `
            .setOptions(operatorsProjectOptions)
            .setReturnExport("result")
            .expectToEqual(expectResult);
    }
);

test("concat operator mapping - global function", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare const op: LuaConcat<OpTest, OpTest, string>;
        const left = new OpTest(7);
        const right = new OpTest(4);
        export const result = op(left, right);
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual("74");
});

test("concat operator mapping - static function", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare namespace OpTest {
            export const op: LuaConcat<OpTest, OpTest, string>;
        }
        const left = new OpTest(7);
        const right = new OpTest(4);
        export const result = OpTest.op(left, right);
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual("74");
});

test("concat operator mapping - method", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare interface OpTest {
            op: LuaConcatMethod<OpTest, string>;
        }
        const left = new OpTest(7);
        const right = new OpTest(4);
        export const result = left.op(right);
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual("74");
});

const unaryOperatorTests: Array<{ opType: string; operand: number; expectResult: number }> = [
    { opType: "LuaNegation", operand: 13, expectResult: -13 },
    { opType: "LuaBitwiseNot", operand: 13, expectResult: -14 },
    { opType: "LuaLength", operand: 13, expectResult: 13 },
];

test.each(unaryOperatorTests)("unary operator mapping - global function (%s)", ({ opType, operand, expectResult }) => {
    util.testModule`
        ${operatorMapTestObject}
        declare const op: ${opType}<OpTest, number>;
        const operand = new OpTest(${operand});
        export const result = op(operand);
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(unaryOperatorTests)("unary operator mapping - static function (%s)", ({ opType, operand, expectResult }) => {
    util.testModule`
        ${operatorMapTestObject}
        declare namespace OpTest {
            export const op: ${opType}<OpTest, number>;
        }
        const operand = new OpTest(${operand});
        export const result = OpTest.op(operand);
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(unaryOperatorTests)("unary operator mapping - method (%s)", ({ opType, operand, expectResult }) => {
    util.testModule`
        ${operatorMapTestObject}
        declare interface OpTest {
            op: ${opType}Method<number>;
        }
        const operand = new OpTest(${operand});
        export const result = operand.op();
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(luaTargetsPre53)("unsupported unary operator mapping (%s LuaBitwiseNot)", luaTarget => {
    util.testModule`
        declare interface OpTest { value: number; }
        declare const op: LuaBitwiseNot<OpTest, OpTest>;
        declare const operand: OpTest;
        op(operand);
    `
        .setOptions({ ...operatorsProjectOptions, luaTarget })
        .expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]);
});

test("operator mapping overload - global function", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare const op: LuaAddition<OpTest, OpTest, OpTest> & LuaAddition<OpTest, number, number>;
        const left = new OpTest(4);
        const right = new OpTest(7);
        const resultA = op(left, right).value;
        const resultB = op(left, 13);
        export const result = {resultA, resultB};
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual({ resultA: 11, resultB: 17 });
});

test("operator mapping overload - static function", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare namespace OpTest {
            export const op: LuaAddition<OpTest, OpTest, OpTest> & LuaAddition<OpTest, number, number>;
        }
        const left = new OpTest(4);
        const right = new OpTest(7);
        const resultA = OpTest.op(left, right).value;
        const resultB = OpTest.op(left, 13);
        export const result = {resultA, resultB};
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual({ resultA: 11, resultB: 17 });
});

test("operator mapping overload - method", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare interface OpTest {
            op: LuaAdditionMethod<OpTest, OpTest> & LuaAdditionMethod<number, number>;
        }
        const left = new OpTest(4);
        const right = new OpTest(7);
        const resultA = left.op(right).value;
        const resultB = left.op(13);
        export const result = {resultA, resultB};
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual({ resultA: 11, resultB: 17 });
});

test("operator mapping - method element call", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare interface OpTest {
            add: LuaAdditionMethod<number, number>;
        }
        const left = new OpTest(7);
        export const result = left["add"](4);
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(11);
});

test("operator mapping - function element call", () => {
    util.testModule`
        ${operatorMapTestObject}
        declare namespace OpTest {
            export const add: LuaAddition<OpTest, number, number>;
        }
        const left = new OpTest(7);
        export const result = OpTest["add"](left, 4);
    `
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(11);
});

test.each([
    "const foo: unknown = op;",
    "const foo = `${op}`",
    "declare function foo(op: LuaAddition<number, number, number>): void; foo(op);",
    "const foo = (op as any)(1, 2);",
    "const foo = [op];",
])("operator mapping - invalid use (%s)", invalidCode => {
    util.testModule`
        declare const op: LuaAddition<number, number, number>;
        ${invalidCode}
    `
        .setOptions(operatorsProjectOptions)
        .expectDiagnosticsToMatchSnapshot([invalidCallExtensionUse.code]);
});
