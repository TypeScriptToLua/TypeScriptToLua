import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import { invalidOperatorMappingUse } from "../../../src/transformation/utils/diagnostics";

const operatorsProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

const operatorMapTestObject = `
	class OpMap {
		public value: number;
		public constructor(value: number) { this.value = value; }

		public __add(other: OpMap): OpMap;
		public __add(other: number): number;
		public __add(other: OpMap | number) {
			if (typeof other === "number") {
				return this.value + other;
			} else {
				return new OpMap(this.value + other.value);
			}
		}
		public __sub(other: OpMap) { return this.value - other.value; }
		public __mul(other: OpMap) { return this.value * other.value; }
		public __div(other: OpMap) { return this.value / other.value; }
		public __mod(other: OpMap) { return this.value % other.value; }
		public __pow(other: OpMap) { return this.value ** other.value; }
		public __idiv(other: OpMap) { return Math.floor(this.value / other.value); }
		public __band(other: OpMap) { return this.value & other.value; }
		public __bor(other: OpMap) { return this.value | other.value; }
		public __bxor(other: OpMap) { return this.value ^ other.value; }
		public __shl(other: OpMap) { return this.value << other.value; }
		public __shr(other: OpMap) { return this.value >>> other.value; }
		public __concat(other: OpMap) { return this.value.toString() + other.value.toString(); }
		public __lt(other: OpMap) { return this.value < other.value; }
		public __gt(other: OpMap) { return this.value > other.value; }

		public __unm() { return -this.value; }
		public __bnot() { return ~this.value; }
		public __len() { return this.value; }
	}
`;

const binaryOperatorTests = [["LuaAdd", 4, 7, 11]] as const;

test.each(binaryOperatorTests)("binary operator mapping - global function", (opType, a, b, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare const op: ${opType}<OpMap, OpMap, OpMap>;
		const a = new OpMap(${a});
		const b = new OpMap(${b});
		export const result = op(a, b).value;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(binaryOperatorTests)("binary operator mapping - static function", (opType, a, b, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare namespace OpMap {
			export const op: ${opType}<OpMap, OpMap, OpMap>;
		}
		const a = new OpMap(${a});
		const b = new OpMap(${b});
		export const result = OpMap.op(a, b).value;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test.each(binaryOperatorTests)("binary operator mapping - method", (opType, a, b, expectResult) => {
    util.testModule`
		${operatorMapTestObject}
		declare interface OpMap {
			op: ${opType}Method<OpMap, OpMap>;
		}
		const a = new OpMap(${a});
		const b = new OpMap(${b});
		export const result = a.op(b).value;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(expectResult);
});

test("operator mapping overload - global function", () => {
    util.testModule`
		${operatorMapTestObject}
		declare const op: LuaAdd<OpMap, OpMap, OpMap> & LuaAdd<OpMap, number, number>;
		const a = new OpMap(4);
		const b = new OpMap(7);
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
		declare namespace OpMap {
			export const op: LuaAdd<OpMap, OpMap, OpMap> & LuaAdd<OpMap, number, number>;
		}
		const a = new OpMap(4);
		const b = new OpMap(7);
		const resultA = OpMap.op(a, b).value;
		const resultB = OpMap.op(a, 13);
		export const result = resultA * 100 + resultB;
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(1117);
});

test("operator mapping overload - method", () => {
    util.testModule`
		${operatorMapTestObject}
		declare interface OpMap {
			op: LuaAddMethod<OpMap, OpMap> & LuaAddMethod<number, number>;
		}
		const a = new OpMap(4);
		const b = new OpMap(7);
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
		declare interface OpMap {
			add: LuaAddMethod<number, number>;
		}
		const a = new OpMap(7);
		export const result = a["add"](4);
	`
        .setOptions(operatorsProjectOptions)
        .setReturnExport("result")
        .expectToEqual(11);
});

test("operator mapping - function element call", () => {
    util.testModule`
		${operatorMapTestObject}
		declare namespace OpMap {
			export const add: LuaAdd<OpMap, number, number>;
		}
		const a = new OpMap(7);
		export const result = OpMap["add"](a, 4);
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
