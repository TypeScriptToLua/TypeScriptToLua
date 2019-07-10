import * as ts from "typescript";
import * as tstl from "../../src";
import * as TSTLErrors from "../../src/TSTLErrors";
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

test.each([
    { input: "true ? 'a' : 'b'" },
    { input: "false ? 'a' : 'b'" },
    { input: "true ? false : true" },
    { input: "false ? false : true" },
    { input: "true ? literalValue : true" },
    { input: "true ? variableValue : true" },
    { input: "true ? maybeUndefinedValue : true" },
    { input: "true ? maybeBooleanValue : true" },
    { input: "true ? maybeUndefinedValue : true", options: { strictNullChecks: true } },
    { input: "true ? maybeBooleanValue : true", options: { strictNullChecks: true } },
    { input: "true ? undefined : true", options: { strictNullChecks: true } },
    { input: "true ? null : true", options: { strictNullChecks: true } },
    { input: "true ? false : true", options: { luaTarget: tstl.LuaTarget.Lua51 } },
    { input: "false ? false : true", options: { luaTarget: tstl.LuaTarget.Lua51 } },
    { input: "true ? undefined : true", options: { luaTarget: tstl.LuaTarget.Lua51 } },
    { input: "true ? false : true", options: { luaTarget: tstl.LuaTarget.LuaJIT } },
    { input: "false ? false : true", options: { luaTarget: tstl.LuaTarget.LuaJIT } },
    { input: "true ? undefined : true", options: { luaTarget: tstl.LuaTarget.LuaJIT } },
])("Ternary operator (%p)", ({ input, options }) => {
    util.testFunction`
        const literalValue = "literal";
        let variableValue: string;
        let maybeBooleanValue: string | boolean = false;
        let maybeUndefinedValue: string | undefined;
        return ${input};
    `
        .setOptions(options)
        .expectToMatchJsResult();
});

test.each([
    { condition: true, lhs: 4, rhs: 5 },
    { condition: false, lhs: 4, rhs: 5 },
    { condition: 3, lhs: 4, rhs: 5 },
])("Ternary Conditional (%p)", ({ condition, lhs, rhs }) => {
    util.testExpressionTemplate`${condition} ? ${lhs} : ${rhs}`.expectToMatchJsResult();
});

test.each(["true", "false", "a < 4", "a == 8"])("Ternary Conditional Delayed (%p)", condition => {
    util.testFunction`
        let a = 3;
        let delay = () => ${condition} ? a + 3 : a + 5;
        a = 8;
        return delay();
    `.expectToMatchJsResult();
});

test.each([
    "inst.field",
    "inst.field + 3",
    "inst.field * 3",
    "inst.field / 2",
    "inst.field && 3",
    "inst.field || 3",
    "(inst.field + 3) & 3",
    "inst.field | 3",
    "inst.field << 3",
    "inst.field >>> 1",
    "inst.field = 3",
    `"abc" + inst.field`,
])("Get accessor expression (%p)", expression => {
    util.testFunction`
        class MyClass {
            public _field: number;
            public get field(): number { return this._field + 4; }
            public set field(v: number) { this._field = v; }
        }
        var inst = new MyClass();
        inst._field = 4;
        return ${expression};
    `.expectToMatchJsResult();
});

test.each(["= 4", "-= 3", "+= 3", "*= 3", "/= 2", "&= 3", "|= 3", "<<= 3", ">>>= 3"])(
    "Set accessorExpression (%p)",
    expression => {
        util.testFunction`
            class MyClass {
                public _field: number = 4;
                public get field(): number { return this._field; }
                public set field(v: number) { this._field = v + 4; }
            }
            var inst = new MyClass();
            inst.field ${expression};
            return inst._field;
        `.expectToMatchJsResult();
    }
);

test.each(["inst.baseField", "inst.field", "inst.superField", "inst.superBaseField"])(
    "Inherited accessors (%p)",
    expression => {
        util.testFunction`
            class MyBaseClass {
                public _baseField: number;
                public get baseField(): number { return this._baseField + 6; }
                public set baseField(v: number) { this._baseField = v; }
            }
            class MyClass extends MyBaseClass {
                public _field: number;
                public get field(): number { return this._field + 4; }
                public set field(v: number) { this._field = v; }
            }
            class MySuperClass extends MyClass {
                public _superField: number;
                public get superField(): number { return this._superField + 2; }
                public set superField(v: number) { this._superField = v; }
                public get superBaseField() { return this.baseField - 3; }
            }
            var inst = new MySuperClass();
            inst.baseField = 1;
            inst.field = 2;
            inst.superField = 3;
            return ${expression};
        `.expectToMatchJsResult();
    }
);

test.each(["return x.value;", "x.value = 3; return x.value;"])("Union accessors (%p)", expression => {
    util.testFunction`
        class A{ get value(){ return this.v || 1; } set value(v){ this.v = v; } v: number; }
        class B{ get value(){ return this.v || 2; } set value(v){ this.v = v; } v: number; }
        let x: A|B = new A();
        ${expression}
    `.expectToMatchJsResult();
});

test.each(["i++", "i--", "++i", "--i"])("Incrementor value (%p)", expression => {
    util.testFunction`
        let i = 10;
        return ${expression};
    `.expectToMatchJsResult();
});

test.each(["a++", "a--", "--a", "++a"])("Template string expression (%p)", lambda => {
    util.testFunction`
        let a = 3;
        return \`val\${${lambda}}\`;
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

test("Block expression", () => {
    util.testFunction`
        let a = 4;
        { let a = 42; }
        return a;
    `.expectToMatchJsResult();
});

test("Non-null expression", () => {
    util.testFunction`
        function abc(): number | undefined { return 3; }
        const a: number = abc()!;
        return a;
    `.expectToMatchJsResult();
});

test("Unknown unary postfix error", () => {
    const transformer = util.makeTestTransformer();

    const mockExpression: any = {
        operand: ts.createLiteral(false),
        operator: ts.SyntaxKind.AsteriskToken,
    };

    expect(() =>
        transformer.transformPostfixUnaryExpression(mockExpression as ts.PostfixUnaryExpression)
    ).toThrowExactError(
        TSTLErrors.UnsupportedKind("unary postfix operator", ts.SyntaxKind.AsteriskToken, util.nodeStub)
    );
});

test("Unknown unary postfix error", () => {
    const transformer = util.makeTestTransformer();

    const mockExpression: any = {
        operand: ts.createLiteral(false),
        operator: ts.SyntaxKind.AsteriskToken,
    };

    expect(() =>
        transformer.transformPrefixUnaryExpression(mockExpression as ts.PrefixUnaryExpression)
    ).toThrowExactError(
        TSTLErrors.UnsupportedKind("unary prefix operator", ts.SyntaxKind.AsteriskToken, util.nodeStub)
    );
});

test("Incompatible fromCodePoint expression error", () => {
    util.testExpression`String.fromCodePoint(123)`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(
            TSTLErrors.UnsupportedForTarget("string property fromCodePoint", tstl.LuaTarget.Lua53, util.nodeStub)
        );
});

test("Unknown string expression error", () => {
    util.testExpression`String.abcd()`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(
            TSTLErrors.UnsupportedForTarget("string property abcd", tstl.LuaTarget.Lua53, util.nodeStub)
        );
});

test("Unsupported array function error", () => {
    util.testFunction`[].unknownFunction()`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(TSTLErrors.UnsupportedProperty("array", "unknownFunction", util.nodeStub));
});

test("Unsupported math property error", () => {
    util.testExpression`Math.unknownProperty`
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(TSTLErrors.UnsupportedProperty("math", "unknownProperty", util.nodeStub));
});

test("Unsupported object literal element error", () => {
    const transformer = util.makeTestTransformer();

    const mockObject: any = {
        properties: [
            {
                kind: ts.SyntaxKind.FalseKeyword,
                name: ts.createIdentifier("testProperty"),
            },
        ],
    };

    expect(() => transformer.transformObjectLiteral(mockObject as ts.ObjectLiteralExpression)).toThrowExactError(
        TSTLErrors.UnsupportedKind("object literal element", ts.SyntaxKind.FalseKeyword, util.nodeStub)
    );
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
    '"bar" in bar',
    "foo as Function",
    "Math.log2(2)",
    "Math.log10(2)",
])("Expression statements (%p)", input => {
    util.testFunction`
        function foo() { return 17; }
        const bar = {};
        ${input};
        return 1;
    `.expectToMatchJsResult();
});

test("binary expression with 'as' type assertion wrapped in parenthesis", () => {
    expect(util.transpileAndExecute("return 2 * (3 - 2 as number);")).toBe(2);
});

test.each([
    "(x as any).foo;",
    "(y.x as any).foo;",
    "(y['x'] as any).foo;",
    "(z() as any).foo;",
    "(y.z() as any).foo;",
    "(<any>x).foo;",
    "(<any>y.x).foo;",
    "(<any>y['x']).foo;",
    "(<any>z()).foo;",
    "(<any>y.z()).foo;",
    "(x as unknown as any).foo;",
    "(<unknown>x as any).foo;",
    "((x as unknown) as any).foo;",
    "((<unknown>x) as any).foo;",
])("'as' type assertion should strip parenthesis (%p)", expression => {
    const code = `
        declare let x: unknown;
        declare let y: { x: unknown; z(this: void): unknown; };
        declare function z(this: void): unknown;
        ${expression}`;

    const lua = util.transpileString(code, undefined, false);
    expect(lua).not.toMatch(/\(.+\)/);
});

test.each([
    "(x + 1 as any).foo;",
    "(!x as any).foo;",
    "(x ** 2 as any).foo;",
    "(x < 2 as any).foo;",
    "(x in y as any).foo;",
    "(<any>x + 1).foo;",
    "(<any>!x).foo;",
    "(x + 1 as unknown as any).foo;",
    "((x + 1 as unknown) as any).foo;",
    "(!x as unknown as any).foo;",
    "((!x as unknown) as any).foo;",
    "(<unknown>!x as any).foo;",
    "((<unknown>!x) as any).foo;",
])("'as' type assertion should not strip parenthesis (%p)", expression => {
    const code = `
        declare let x: number;
        declare let y: {};
        ${expression}`;

    const lua = util.transpileString(code, undefined, false);
    expect(lua).toMatch(/\(.+\)/);
});

test("not operator precedence (%p)", () => {
    const code = `
        const a = true;
        const b = false;
        return !a && b;`;

    expect(util.transpileAndExecute(code)).toBe(false);
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
