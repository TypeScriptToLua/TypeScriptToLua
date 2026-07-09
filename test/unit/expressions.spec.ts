import * as tstl from "../../src";
import { unsupportedForTarget, unsupportedRightShiftOperator } from "../../src/transformation/utils/diagnostics";
import * as util from "../util";

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
    util.testFunction(input).disableSemanticCheck().expectLuaToMatchSnapshot();
});

for (const expression of ["3+4", "5-2", "6*3", "6**3", "20/5", "15/10", "15%3"]) {
    util.testEachVersion(
        `Binary expressions basic numeric (${expression})`,
        () => util.testExpression(expression),
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );
}

test.each(["1==1", "1===1", "1!=1", "1!==1", "1>1", "1>=1", "1<1", "1<=1", "1&&1", "1||1"])(
    "Binary expressions basic boolean (%p)",
    input => {
        util.testExpression(input).expectToMatchJsResult();
    }
);

test.each(["'key' in obj", "'existingKey' in obj", "0 in obj", "9 in obj"])("Binary expression in (%p)", input => {
    util.testFunction`
        let obj = { existingKey: 1 };
        return ${input};
    `.expectToMatchJsResult();
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
const unsupportedIn53And54 = ["a>>b", "a>>=b"];
const allBinaryOperators = [...supportedInAll, ...unsupportedIn53And54];
test.each(allBinaryOperators)("Bitop [5.0] (%p)", input => {
    // Bit operations not supported in 5.0, expect an exception
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua50, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]);
});

test.each(allBinaryOperators)("Bitop [5.1] (%p)", input => {
    // Bit operations not supported in 5.1, expect an exception
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua51, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]);
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

test.each(supportedInAll)("Bitop [5.4] (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua54, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(supportedInAll)("Bitop [5.5] (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua55, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(unsupportedIn53And54)("Unsupported bitop 5.3 (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua53, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectDiagnosticsToMatchSnapshot([unsupportedRightShiftOperator.code]);
});

test.each(unsupportedIn53And54)("Unsupported bitop 5.4 (%p)", input => {
    util.testExpression(input)
        .setOptions({ luaTarget: tstl.LuaTarget.Lua54, luaLibImport: tstl.LuaLibImportKind.None })
        .disableSemanticCheck()
        .expectDiagnosticsToMatchSnapshot([unsupportedRightShiftOperator.code]);
});

// Execution tests: verify >>> produces correct results matching JS semantics
for (const expression of ["-5 >>> 0", "-1 >>> 0", "1 >>> 0", "-1 >>> 16", "255 >>> 4"]) {
    util.testEachVersion(`Unsigned right shift execution (${expression})`, () => util.testExpression(expression), {
        [tstl.LuaTarget.Universal]: false,
        [tstl.LuaTarget.Lua50]: false, // No bit library in WASM runtime
        [tstl.LuaTarget.Lua51]: false, // No bit library in WASM runtime
        [tstl.LuaTarget.Lua52]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.Lua53]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.Lua54]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.Lua55]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.LuaJIT]: false, // Can't execute LuaJIT in tests
        [tstl.LuaTarget.Luau]: false,
    });
}

for (const code of ["let a = -5; a >>>= 0; return a;", "let a = -1; a >>>= 16; return a;"]) {
    util.testEachVersion(`Unsigned right shift assignment execution (${code})`, () => util.testFunction(code), {
        [tstl.LuaTarget.Universal]: false,
        [tstl.LuaTarget.Lua50]: false, // No bit library in WASM runtime
        [tstl.LuaTarget.Lua51]: false, // No bit library in WASM runtime
        [tstl.LuaTarget.Lua52]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.Lua53]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.Lua54]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.Lua55]: builder => builder.expectToMatchJsResult(),
        [tstl.LuaTarget.LuaJIT]: false, // Can't execute LuaJIT in tests
        [tstl.LuaTarget.Luau]: false,
    });
}

// Known bugs in << and >>> lowering on Lua 5.2/5.3+ (separate from PR #1721 / issue #1720):
//   - `<<` does not truncate the result to int32 (e.g. `1 << 31` returns 2147483648, not -2147483648).
//   - `<<` and `>>>` do not mask the shift amount to 5 bits like JS does.
// These tests are marked `failing` to document the divergence; remove `.failing` once fixed.
const knownBuggyTargets = [tstl.LuaTarget.Lua52, tstl.LuaTarget.Lua53, tstl.LuaTarget.Lua54, tstl.LuaTarget.Lua55];
for (const expression of ["1 << 31", "0xFFFF << 16", "1 << 30 << 1", "1 << 32", "5 << 33"]) {
    for (const target of knownBuggyTargets) {
        test.failing(`Left shift execution (${expression}) [${target}]`, () => {
            util.testExpression(expression).setOptions({ luaTarget: target }).expectToMatchJsResult();
        });
    }
}
for (const expression of ["1 >>> 32", "5 >>> 33", "-1 >>> 32"]) {
    for (const target of knownBuggyTargets) {
        test.failing(`Unsigned right shift count masking (${expression}) [${target}]`, () => {
            util.testExpression(expression).setOptions({ luaTarget: target }).expectToMatchJsResult();
        });
    }
}

test.each(["1+1", "-1+1", "1*30+4", "1*(3+4)", "1*(3+4*2)", "10-(4+5)"])(
    "Binary expressions ordering parentheses (%p)",
    input => {
        util.testExpression(input).expectLuaToMatchSnapshot();
    }
);

test("Assignment order of operations is preserved", () => {
    util.testFunction`
        let x = 0;
        x *= 2 + 3;
        return x;
    `.expectToMatchJsResult();
});

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
    util.testExpression("null").expectLuaToMatchSnapshot();
});

test("Undefined Expression", () => {
    util.testExpression("undefined").expectLuaToMatchSnapshot();
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

test("Typescript 4.7 instantiation expression", () => {
    util.testFunction`
        function foo<T>(x: T): T { return x; }
        const bar = foo<number>;
        return bar(3);
    `.expectToMatchJsResult();
});

test("Typescript 4.9 satisfies expression", () => {
    util.testFunction`
        const foo = { a: 1 } satisfies { a: number };
        return foo.a;
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
