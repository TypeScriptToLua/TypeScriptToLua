import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import { invalidOperatorMappingUse } from "../../../src/transformation/utils/diagnostics";

const operatorsProjectOptions: tstl.CompilerOptions = {
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
		public __sub(other: OpTest) { return this.value - other.value; }
		public __mul(other: OpTest) { return this.value * other.value; }
		public __div(other: OpTest) { return this.value / other.value; }
		public __mod(other: OpTest) { return this.value % other.value; }
		public __pow(other: OpTest) { return this.value ** other.value; }
		public __idiv(other: OpTest) { return Math.floor(this.value / other.value); }
		public __band(other: OpTest) { return this.value & other.value; }
		public __bor(other: OpTest) { return this.value | other.value; }
		public __bxor(other: OpTest) { return this.value ^ other.value; }
		public __shl(other: OpTest) { return this.value << other.value; }
		public __shr(other: OpTest) { return this.value >>> other.value; }
		public __concat(other: OpTest) { return this.value.toString() + other.value.toString(); }
		public __lt(other: OpTest) { return this.value < other.value; }
		public __gt(other: OpTest) { return this.value > other.value; }

		public __unm() { return -this.value; }
		public __bnot() { return ~this.value; }
		public __len() { return this.value; }
	}
`;

const binaryOperatorTests = [["LuaAdd", 4, 7, 11]] as const;

test.each(binaryOperatorTests)("binary operator mapping - global function", (opType, valueA, valueB, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare const op: ${opType}<OpTest, OpTest, OpTest>;
		const a = new OpTest(${valueA});
		const b = new OpTest(${valueB});
		export const result = op(a, b).value;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(binaryOperatorTests)("binary operator mapping - static function", (opType, valueA, valueB, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare namespace OpTest {
			export const op: ${opType}<OpTest, OpTest, OpTest>;
		}
		const a = new OpTest(${valueA});
		const b = new OpTest(${valueB});
		export const result = OpTest.op(a, b).value;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(binaryOperatorTests)("binary operator mapping - method", (opType, valueA, valueB, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare interface OpTest {
			op: ${opType}Method<OpTest, OpTest>;
		}
		const a = new OpTest(${valueA});
		const b = new OpTest(${valueB});
		export const result = a.op(b).value;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

const unaryOperatorTests = [["LuaLen", 13, 13]] as const;

test.each(unaryOperatorTests)("unary operator mapping - global function", (opType, value, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare const op: ${opType}<OpTest, number>;
		const a = new OpTest(${value});
		export const result = op(a);
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(unaryOperatorTests)("unary operator mapping - static function", (opType, value, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare namespace OpTest {
			export const op: ${opType}<OpTest, number>;
		}
		const a = new OpTest(${value});
		export const result = OpTest.op(a);
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(unaryOperatorTests)("unary operator mapping - method", (opType, value, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare interface OpTest {
			op: ${opType}Method<number>;
		}
		const a = new OpTest(${value});
		export const result = a.op();
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test("operator mapping overload - global function", () => {
    util.testModule`
		${operatorMapTestObject}
		declare const op: LuaAdd<OpTest, OpTest, OpTest> & LuaAdd<OpTest, number, number>;
		const a = new OpTest(4);
		const b = new OpTest(7);
		const resultA = op(a, b).value;
		const resultB = op(a, 13);
		export const result = resultA * 100 + resultB;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(1117);
});

test("operator mapping overload - static function", () => {
    util.testModule`
		${operatorMapTestObject}
		declare namespace OpTest {
			export const op: LuaAdd<OpTest, OpTest, OpTest> & LuaAdd<OpTest, number, number>;
		}
		const a = new OpTest(4);
		const b = new OpTest(7);
		const resultA = OpTest.op(a, b).value;
		const resultB = OpTest.op(a, 13);
		export const result = resultA * 100 + resultB;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(1117);
});

test("operator mapping overload - method", () => {
    util.testModule`
		${operatorMapTestObject}
		declare interface OpTest {
			op: LuaAddMethod<OpTest, OpTest> & LuaAddMethod<number, number>;
		}
		const a = new OpTest(4);
		const b = new OpTest(7);
		const resultA = a.op(b).value;
		const resultB = a.op(13);
		export const result = resultA * 100 + resultB;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(1117);
});

test("operator mapping - method element call", () => {
    util.testModule`
		${operatorMapTestObject}
		declare interface OpTest {
			add: LuaAddMethod<number, number>;
		}
		const a = new OpTest(7);
		export const result = a["add"](4);
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(11);
});

test("operator mapping - function element call", () => {
    util.testModule`
		${operatorMapTestObject}
		declare namespace OpTest {
			export const add: LuaAdd<OpTest, number, number>;
		}
		const a = new OpTest(7);
		export const result = OpTest["add"](a, 4);
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(11);
});

test.each([
    "const foo: unknown = op;",
    "const foo = `${op}`",
    "declare function foo(op: LuaAdd<number, number, number>): void; foo(op);",
    "const foo = (op as any)(1, 2);",
    "const foo = [op];",
])("operator mapping - invalid use (%s)", invalidCode => {
    util.testModule`
		declare const op: LuaAdd<number, number, number>;
		${invalidCode}
	`
        .setOptions(operatorsProjectOptions)
        .expectDiagnosticsToMatchSnapshot([invalidOperatorMappingUse.code]);
});
