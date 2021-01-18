import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";

const operatorsProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

const binaryOperatorTestTemplate = `
	class BinOp {
		public value: number;
		public constructor(value: number) { this.value = value; }
		public \${luaOp}(other: BinOp): BinOp;
		public \${luaOp}(other: number): number;
		public \${luaOp}(other: BinOp | number) {
			if (type(other) === "number") {
				return this.value \${op} (other as number);
			} else {
				return new BinOp(this.value \${op} (other as BinOp).value);
			}
		}
	}

	declare interface BinOp {
		opMethod: (
			OperatorMethod\${opName}<BinOp, BinOp, BinOp>
			& OperatorMethod\${opName}<BinOp, number, number>
		);
	}

	declare namespace BinOp {
		export const opFn: (
			Operator\${opName}<BinOp, BinOp, BinOp>
			& Operator\${opName}<BinOp, number, number>
		);
	}
	`;

function makeBinaryOperatorTestCode(luaOp: string, opName: string, op: string) {
    return binaryOperatorTestTemplate.replace("${luaOp}", luaOp).replace("${opName}", opName).replace("${op}", op);
}

const binaryOperatorTests = [["__add", "Add", "+", 7, 4, 11]] as const;

test.each(binaryOperatorTests)(
    "binary operator - object overload (function)",
    (luaOp, opName, op, a, b, expectResult) => {
        util.testFunction`
		${makeBinaryOperatorTestCode(luaOp, opName, op)}
		const a = new BinOp(${a});
		const b = new BinOp(${b});
		return BinOp.opFn(a, b);
	`
            .setOptions(operatorsProjectOptions)
            .expectToEqual(expectResult);
    }
);

test.each(binaryOperatorTests)(
    "binary operator - object overload (method)",
    (luaOp, opName, op, a, b, expectResult) => {
        util.testFunction`
		${makeBinaryOperatorTestCode(luaOp, opName, op)}
		const a = new BinOp(${a});
		const b = new BinOp(${b});
		return a.opMethod(b);
	`
            .setOptions(operatorsProjectOptions)
            .expectToEqual(expectResult);
    }
);

test.each(binaryOperatorTests)(
    "binary operator - number overload (function)",
    (luaOp, opName, op, a, b, expectResult) => {
        util.testFunction`
		${makeBinaryOperatorTestCode(luaOp, opName, op)}
		const a = new BinOp(${a});
		return BinOp.opFn(a, ${b});
	`
            .setOptions(operatorsProjectOptions)
            .expectToEqual(expectResult);
    }
);

test.each(binaryOperatorTests)(
    "binary operator - number overload - number overload (method)",
    (luaOp, opName, op, a, b, expectResult) => {
        util.testFunction`
		${makeBinaryOperatorTestCode(luaOp, opName, op)}
		const a = new BinOp(${a});
		return a.opMethod(${b});
	`
            .setOptions(operatorsProjectOptions)
            .expectToEqual(expectResult);
    }
);
