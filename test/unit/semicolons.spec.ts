import * as util from "../util";

test.each([
	"const a = 1; const b = a;",
	"const a = 1; let b: number; b = a;",
	"{}",
	"function bar() {} bar();"
])(
	"semicolon insertion (%p)",
	leadingStatement => {
		const code = `
			let result = "";
			function foo() { result = "foo"; }
			${leadingStatement}
			(foo)();
			return result;
		`;
		expect(util.transpileAndExecute(code)).toEqual("foo");
	},
);
