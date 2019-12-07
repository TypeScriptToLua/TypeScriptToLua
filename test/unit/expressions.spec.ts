import * as ts from "typescript";
import * as tstl from "../../src";
import { UnsupportedForTarget, UnsupportedKind } from "../../src/transformation/utils/errors";
import * as util from "../util";

// TODO:
test("Block statement", () => {
    util.testFunction`
        let a = 4;
        { let a = 42; }
        return a;
    `.expectToMatchJsResult();
});

test.each([
    "i++",
    "++i",
    "i--",
    "--i",
    "!a",
    "-a",
    "+a",
    "let a = delete tbl['test']",
    "delete tbl['test']",
    "let a = delete tbl.test",
    "delete tbl.test",
])("Unary expressions basic (%p)", input => {
    util.testFunction(input)
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(["3+4", "5-2", "6*3", "6**3", "20/5", "15/10", "15%3"])("Binary expressions basic numeric (%p)", input => {
    util.testExpression(input).expectToMatchJsResult();
});

test.each(["1==1", "1===1", "1!=1", "1!==1", "1>1", "1>=1", "1<1", "1<=1", "1&&1", "1||1"])(
    "Binary expressions basic boolean (%p)",
    input => {
        util.testExpression(input).expectToMatchJsResult();
    }
);

test.each(["'key' in obj", "'existingKey' in obj", "0 in obj", "9 in obj"])("Binary expression in (%p)", input => {
    const tsHeader = "declare var obj: any;";
    const tsSource = `return ${input}`;
    const luaHeader = "obj = { existingKey = 1 }";
    const result = util.transpileAndExecute(tsSource, undefined, luaHeader, tsHeader);

    expect(result).toBe(eval(`let obj = { existingKey: 1 }; ${input}`));
});

test.each(["a+=b", "a-=b", "a*=b", "a/=b", "a%=b", "a**=b"])("Binary expressions overridden operators (%p)", input => {
    util.testFunction`
        let a = 5;
        let b = 3;
        ${input};
        return a;
    `.expectToMatchJsResult();
});

const supportedInAll = ["~a", "a&b", "a&=b", "a|b", "a|=b", "a^b", "a^=b", "a<<b", "a<<=b", "a>>>b", "a>>>=b"];
const unsupportedIn53 = ["a>>b", "a>>=b"];
const allBinaryOperators = [...supportedInAll, ...unsupportedIn53];
test.each(allBinaryOperators)("Bitop [5.1] (%p)", input => {
    // Bit operations not supported in 5.1, expect an exception
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua51, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(UnsupportedForTarget("Bitwise operations", tstl.LuaTarget.Lua51, util.nodeStub));
});

test.each(allBinaryOperators)("Bitop [JIT] (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.LuaJIT, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(allBinaryOperators)("Bitop [5.2] (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua52, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(supportedInAll)("Bitop [5.3] (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua53, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(unsupportedIn53)("Unsupported bitop 5.3 (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua53, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(
            UnsupportedKind(
                "right shift operator (use >>> instead)",
                ts.SyntaxKind.GreaterThanGreaterThanToken,
                util.nodeStub
            )
        );
});

test.each(["1+1", "-1+1", "1*30+4", "1*(3+4)", "1*(3+4*2)", "10-(4+5)"])(
    "Binary expressions ordering parentheses (%p)",
    input => {
        util.testExpression(input).expectLuaToMatchSnapshot();
    }
);

test.each(["bar(),foo()", "foo(),bar()", "foo(),bar(),baz()"])("Binary Comma (%p)", input => {
    util.testFunction`
        function foo() { return 1; }
        function bar() { return 2; };
        function baz() { return 3; };
        return (${input});
    `.expectToMatchJsResult();
});

test("Binary Comma Statement in For Loop", () => {
    util.testFunction`
        let x: number, y: number;
        for (x = 0, y = 17; x < 5; ++x, --y) {}
        return y;
    `.expectToMatchJsResult();
});

test("Null Expression", () => {
    expect(util.transpileString("null")).toBe("local ____ = nil");
});

test("Undefined Expression", () => {
    expect(util.transpileString("undefined")).toBe("local ____ = nil");
});

test.each(["i++", "i--", "++i", "--i"])("Incrementor value (%p)", expression => {
    util.testFunction`
        let i = 10;
        return ${expression};
    `.expectToMatchJsResult();
});

test("Non-null expression", () => {
    util.testFunction`
        function abc(): number | undefined { return 3; }
        const a: number = abc()!;
        return a;
    `.expectToMatchJsResult();
});

test.each([
    '"foobar"',
    "17",
    "true",
    "{}",
    "[]",
    "[].length",
    "foo() + foo()",
    "!foo()",
    "foo()",
    "typeof foo",
    '"foo" in bar',
    "foo as Function",
    "Math.log2(2)",
    "Math.log10(2)",
    '"".indexOf("")',
])("Expression statements (%p)", input => {
    util.testFunction`
        function foo() { return 17; }
        const bar = { foo };
        ${input};
    `.expectNoExecutionError();
});
