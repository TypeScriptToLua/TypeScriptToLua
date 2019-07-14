import * as ts from "typescript";
import * as tstl from "../../src";
import * as TSTLErrors from "../../src/TSTLErrors";
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
        .expectToHaveDiagnosticOfError(
            TSTLErrors.UnsupportedForTarget("Bitwise operations", tstl.LuaTarget.Lua51, util.nodeStub)
        );
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
            TSTLErrors.UnsupportedKind(
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

test.each(["x = y", "x += y"])("Assignment expressions (%p)", expression => {
    util.testFunction`
        let x = "x";
        let y = "y";
        return ${expression};
    `.expectToMatchJsResult();
});

test.each(["x = o.p", "x = a[0]", "x = y = o.p", "x = o.p"])("Assignment expressions using temp (%p)", expression => {
    util.testFunction`
        let x = "x";
        let y = "y";
        let o = {p: "o"};
        let a = ["a"];
        return ${expression};
    `.expectToMatchJsResult();
});

test.each(["o.p = x", "a[0] = x", "o.p = a[0]", "o.p = a[0] = x"])(
    "Property assignment expressions (%p)",
    expression => {
        util.testFunction`
            let x = "x";
            let o = {p: "o"};
            let a = ["a"];
            return ${expression};
        `.expectToMatchJsResult();
    }
);

test.each([
    "x = t()",
    "x = tr()",
    "[x[1], x[0]] = t()",
    "[x[1], x[0]] = tr()",
    "x = [y[1], y[0]]",
    "[x[0], x[1]] = [y[1], y[0]]",
])("Tuple assignment expressions (%p)", expression => {
    util.testFunction`
        let x: [string, string] = ["x0", "x1"];
        let y: [string, string] = ["y0", "y1"];
        function t(): [string, string] { return ["t0", "t1"] };
        /** @tupleReturn */
        function tr(): [string, string] { return ["tr0", "tr1"] };
        const r = ${expression};
        return \`\${r[0]},\${r[1]}\`
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
])("Expression statements (%p)", input => {
    util.testFunction`
        function foo() { return 17; }
        const bar = { foo };
        ${input};
    `.expectNoExecutionError();
});

// TODO: It probably should be in a different file
test.each([
    "++x",
    "x++",
    "--x",
    "x--",
    "x += y",
    "x -= y",
    "x *= y",
    "y /= x",
    "y %= x",
    "y **= x",
    "x |= y",
    "x &= y",
    "x ^= y",
    "x <<= y",
    "x >>>= y",
])("Operator assignment statements (%p)", statement => {
    util.testFunction`
        let x = 3;
        let y = 6;
        ${statement};
        return { x, y };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p",
    "o.p++",
    "--o.p",
    "o.p--",
    "o.p += a[0]",
    "o.p -= a[0]",
    "o.p *= a[0]",
    "a[0] /= o.p",
    "a[0] %= o.p",
    "a[0] **= o.p",
    "o.p |= a[0]",
    "o.p &= a[0]",
    "o.p ^= a[0]",
    "o.p <<= a[0]",
    "o.p >>>= a[0]",
])("Operator assignment to simple property statements (%p)", statement => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p.d",
    "o.p.d++",
    "--o.p.d",
    "o.p.d--",
    "o.p.d += a[0][0]",
    "o.p.d -= a[0][0]",
    "o.p.d *= a[0][0]",
    "a[0][0] /= o.p.d",
    "a[0][0] %= o.p.d",
    "a[0][0] **= o.p.d",
    "o.p.d |= a[0][0]",
    "o.p.d &= a[0][0]",
    "o.p.d ^= a[0][0]",
    "o.p.d <<= a[0][0]",
    "o.p.d >>>= a[0][0]",
])("Operator assignment to deep property statements (%p)", statement => {
    util.testFunction`
        let o = { p: { d: 3 } };
        let a = [[6,11], [7,13]];
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p",
    "of().p++",
    "--of().p",
    "of().p--",
    "of().p += af()[i()]",
    "of().p -= af()[i()]",
    "of().p *= af()[i()]",
    "af()[i()] /= of().p",
    "af()[i()] %= of().p",
    "af()[i()] **= of().p",
    "of().p |= af()[i()]",
    "of().p &= af()[i()]",
    "of().p ^= af()[i()]",
    "of().p <<= af()[i()]",
    "of().p >>>= af()[i()]",
])("Operator assignment to complex property statements (%p)", statement => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p.d",
    "of().p.d++",
    "--of().p.d",
    "of().p.d--",
    "of().p.d += af()[i()][i()]",
    "of().p.d -= af()[i()][i()]",
    "of().p.d *= af()[i()][i()]",
    "af()[i()][i()] /= of().p.d",
    "af()[i()][i()] %= of().p.d",
    "af()[i()][i()] **= of().p.d",
    "of().p.d |= af()[i()][i()]",
    "of().p.d &= af()[i()][i()]",
    "of().p.d ^= af()[i()][i()]",
    "of().p.d <<= af()[i()][i()]",
    "of().p.d >>>= af()[i()][i()]",
])("Operator assignment to complex deep property statements (%p)", statement => {
    util.testFunction`
        let o = { p: { d: 3 } };
        let a = [[7, 6], [11, 13]];
        function of() { return o; }
        function af() { return a; }
        let _i = 0;
        function i() { return _i++; }
        ${statement};
        return { o, a, _i };
    `.expectToMatchJsResult();
});

test.each([
    "++x",
    "x++",
    "--x",
    "x--",
    "x += y",
    "x -= y",
    "x *= y",
    "y /= x",
    "y %= x",
    "y **= x",
    "x |= y",
    "x &= y",
    "x ^= y",
    "x <<= y",
    "x >>>= y",
    "x + (y += 7)",
    "x + (y += 7)",
    "x++ + (y += 7)",
])("Operator assignment expressions (%p)", expression => {
    util.testFunction`
        let x = 3;
        let y = 6;
        const r = ${expression};
        return { r, x, y };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p",
    "o.p++",
    "--o.p",
    "o.p--",
    "o.p += a[0]",
    "o.p -= a[0]",
    "o.p *= a[0]",
    "a[0] /= o.p",
    "a[0] %= o.p",
    "a[0] **= o.p",
    "o.p |= a[0]",
    "o.p &= a[0]",
    "o.p ^= a[0]",
    "o.p <<= a[0]",
    "o.p >>>= a[0]",
    "o.p + (a[0] += 7)",
    "o.p += (a[0] += 7)",
    "o.p++ + (a[0] += 7)",
])("Operator assignment to simple property expressions (%p)", expression => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        const r = ${expression};
        return { r, o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p",
    "of().p++",
    "--of().p",
    "of().p--",
    "of().p += af()[i()]",
    "of().p -= af()[i()]",
    "of().p *= af()[i()]",
    "af()[i()] /= of().p",
    "af()[i()] %= of().p",
    "af()[i()] **= of().p",
    "of().p |= af()[i()]",
    "of().p &= af()[i()]",
    "of().p ^= af()[i()]",
    "of().p <<= af()[i()]",
    "of().p >>>= af()[i()]",
    "of().p + (af()[i()] += 7)",
    "of().p += (af()[i()] += 7)",
    "of().p++ + (af()[i()] += 7)",
])("Operator assignment to complex property expressions (%p)", expression => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        const r = ${expression};
        return { r, o, a };
    `.expectToMatchJsResult();
});
