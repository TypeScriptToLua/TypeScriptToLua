import { TranspileError } from "../../src/TranspileError";
import { LuaTarget, LuaLibImportKind } from "../../src/CompilerOptions";

import * as ts from "typescript";
import * as util from "../util";
import { TSTLErrors } from "../../src/TSTLErrors";

test.each([
    { input: "i++", lua: "i = i + 1;" },
    { input: "++i", lua: "i = i + 1;" },
    { input: "i--", lua: "i = i - 1;" },
    { input: "--i", lua: "i = i - 1;" },
    { input: "!a", lua: "not a;" },
    { input: "-a", lua: "-a;" },
    { input: "+a", lua: "a;" },
    {
        input: "let a = delete tbl['test']",
        lua: "local a = (function()\n    tbl.test = nil;\n    return true;\nend)();",
    },
    { input: "delete tbl['test']", lua: "tbl.test = nil;" },
    {
        input: "let a = delete tbl.test",
        lua: "local a = (function()\n    tbl.test = nil;\n    return true;\nend)();",
    },
    { input: "delete tbl.test", lua: "tbl.test = nil;" },
])("Unary expressions basic (%p)", ({ input, lua }) => {
    expect(util.transpileString(input)).toBe(lua);
});

test.each([
    { input: "3+4", output: 3 + 4 },
    { input: "5-2", output: 5 - 2 },
    { input: "6*3", output: 6 * 3 },
    { input: "6**3", output: 6 ** 3 },
    { input: "20/5", output: 20 / 5 },
    { input: "15/10", output: 15 / 10 },
    { input: "15%3", output: 15 % 3 },
])("Binary expressions basic numeric (%p)", ({ input, output }) => {
    const result = util.transpileAndExecute(`return ${input}`);

    expect(result).toBe(output);
});

test.each([
    { input: "1==1", expected: true },
    { input: "1===1", expected: true },
    { input: "1!=1", expected: false },
    { input: "1!==1", expected: false },
    { input: "1>1", expected: false },
    { input: "1>=1", expected: true },
    { input: "1<1", expected: false },
    { input: "1<=1", expected: true },
    { input: "1&&1", expected: 1 },
    { input: "1||1", expected: 1 },
])("Binary expressions basic boolean (%p)", ({ input, expected }) => {
    const result = util.transpileAndExecute(`return ${input}`);

    expect(result).toBe(expected);
});

test.each(["'key' in obj", "'existingKey' in obj", "0 in obj", "9 in obj"])(
    "Binary expression in (%p)",
    input => {
        const tsHeader = "declare var obj: any;";
        const tsSource = `return ${input}`;
        const luaHeader = "obj = { existingKey = 1 }";
        const result = util.transpileAndExecute(tsSource, undefined, luaHeader, tsHeader);

        expect(result).toBe(eval(`let obj = { existingKey: 1 }; ${input}`));
    },
);

test.each([
    { input: "a+=b", expected: 5 + 3 },
    { input: "a-=b", expected: 5 - 3 },
    { input: "a*=b", expected: 5 * 3 },
    { input: "a/=b", expected: 5 / 3 },
    { input: "a%=b", expected: 5 % 3 },
    { input: "a**=b", expected: 5 ** 3 },
])("Binary expressions overridden operators (%p)", ({ input, expected }) => {
    const result = util.transpileAndExecute(`let a = 5; let b = 3; ${input}; return a;`);

    expect(result).toBe(expected);
});

test.each([
    { input: "~b" },
    { input: "a&b" },
    { input: "a&=b" },
    { input: "a|b" },
    { input: "a|=b" },
    { input: "a^b" },
    { input: "a^=b" },
    { input: "a<<b" },
    { input: "a<<=b" },
    { input: "a>>b" },
    { input: "a>>=b" },
    { input: "a>>>b" },
    { input: "a>>>=b" },
])("Bitop [5.1] (%p)", ({ input }) => {
    // Bit operations not supported in 5.1, expect an exception
    expect(() =>
        util.transpileString(input, {
            luaTarget: LuaTarget.Lua51,
            luaLibImport: LuaLibImportKind.None,
        }),
    ).toThrow();
});

test.each([
    { input: "~a", lua: "bit.bnot(a);" },
    { input: "a&b", lua: "bit.band(a, b);" },
    { input: "a&=b", lua: "a = bit.band(a, b);" },
    { input: "a|b", lua: "bit.bor(a, b);" },
    { input: "a|=b", lua: "a = bit.bor(a, b);" },
    { input: "a^b", lua: "bit.bxor(a, b);" },
    { input: "a^=b", lua: "a = bit.bxor(a, b);" },
    { input: "a<<b", lua: "bit.lshift(a, b);" },
    { input: "a<<=b", lua: "a = bit.lshift(a, b);" },
    { input: "a>>b", lua: "bit.arshift(a, b);" },
    { input: "a>>=b", lua: "a = bit.arshift(a, b);" },
    { input: "a>>>b", lua: "bit.rshift(a, b);" },
    { input: "a>>>=b", lua: "a = bit.rshift(a, b);" },
])("Bitop [JIT] (%p)", ({ input, lua }) => {
    const options = { luaTarget: LuaTarget.LuaJIT, luaLibImport: LuaLibImportKind.None };
    expect(util.transpileString(input, options)).toBe(lua);
});

test.each([
    { input: "~a", lua: "bit32.bnot(a);" },
    { input: "a&b", lua: "bit32.band(a, b);" },
    { input: "a&=b", lua: "a = bit32.band(a, b);" },
    { input: "a|b", lua: "bit32.bor(a, b);" },
    { input: "a|=b", lua: "a = bit32.bor(a, b);" },
    { input: "a^b", lua: "bit32.bxor(a, b);" },
    { input: "a^=b", lua: "a = bit32.bxor(a, b);" },
    { input: "a<<b", lua: "bit32.lshift(a, b);" },
    { input: "a<<=b", lua: "a = bit32.lshift(a, b);" },
    { input: "a>>b", lua: "bit32.arshift(a, b);" },
    { input: "a>>=b", lua: "a = bit32.arshift(a, b);" },
    { input: "a>>>b", lua: "bit32.rshift(a, b);" },
    { input: "a>>>=b", lua: "a = bit32.rshift(a, b);" },
])("Bitop [5.2] (%p)", ({ input, lua }) => {
    const options = { luaTarget: LuaTarget.Lua52, luaLibImport: LuaLibImportKind.None };
    expect(util.transpileString(input, options)).toBe(lua);
});

test.each([
    { input: "~a", lua: "~a;" },
    { input: "a&b", lua: "a & b;" },
    { input: "a&=b", lua: "a = a & b;" },
    { input: "a|b", lua: "a | b;" },
    { input: "a|=b", lua: "a = a | b;" },
    { input: "a^b", lua: "a ~ b;" },
    { input: "a^=b", lua: "a = a ~ b;" },
    { input: "a<<b", lua: "a << b;" },
    { input: "a<<=b", lua: "a = a << b;" },
    { input: "a>>>b", lua: "a >> b;" },
    { input: "a>>>=b", lua: "a = a >> b;" },
])("Bitop [5.3] (%p)", ({ input, lua }) => {
    const options = { luaTarget: LuaTarget.Lua53, luaLibImport: LuaLibImportKind.None };
    expect(util.transpileString(input, options)).toBe(lua);
});

test.each(["a>>b", "a>>=b"])("Unsupported bitop 5.3 (%p)", input => {
    expect(() =>
        util.transpileString(input, {
            luaTarget: LuaTarget.Lua53,
            luaLibImport: LuaLibImportKind.None,
        }),
    ).toThrowExactError(
        TSTLErrors.UnsupportedKind(
            "right shift operator (use >>> instead)",
            ts.SyntaxKind.GreaterThanGreaterThanToken,
            util.nodeStub,
        ),
    );
});

test.each([
    { input: "1+1", lua: "1 + 1;" },
    { input: "-1+1", lua: "(-1) + 1;" },
    { input: "1*30+4", lua: "(1 * 30) + 4;" },
    { input: "1*(3+4)", lua: "1 * (3 + 4);" },
    { input: "1*(3+4*2)", lua: "1 * (3 + (4 * 2));" },
])("Binary expressions ordering parentheses (%p)", ({ input, lua }) => {
    expect(util.transpileString(input)).toBe(lua);
});

test.each([
    { input: "bar(),foo()", expectResult: 1 },
    { input: "foo(),bar()", expectResult: 2 },
    { input: "foo(),bar(),baz()", expectResult: 3 },
])("Binary Comma (%p)", ({ input, expectResult }) => {
    const code = `function foo() { return 1; }
        function bar() { return 2; };
        function baz() { return 3; };
        return (${input});`;
    expect(util.transpileAndExecute(code)).toBe(expectResult);
});

test("Binary Comma Statement in For Loop", () => {
    const code = `let x: number, y: number;
        for (x = 0, y = 17; x < 5; ++x, --y) {}
        return y;`;
    expect(util.transpileAndExecute(code)).toBe(12);
});

test("Null Expression", () => {
    expect(util.transpileString("null")).toBe("nil;");
});

test("Undefined Expression", () => {
    expect(util.transpileString("undefined")).toBe("nil;");
});

test.each([
    { input: "true ? 'a' : 'b'", expected: "a" },
    { input: "false ? 'a' : 'b'", expected: "b" },
    { input: "true ? false : true", expected: false },
    { input: "false ? false : true", expected: true },
    { input: "true ? literalValue : true", expected: "literal" },
    { input: "true ? variableValue : true" },
    { input: "true ? maybeUndefinedValue : true" },
    { input: "true ? maybeBooleanValue : true", expected: false },
    { input: "true ? maybeUndefinedValue : true", options: { strictNullChecks: true } },
    {
        input: "true ? maybeBooleanValue : true",
        expected: false,
        options: { strictNullChecks: true },
    },
    { input: "true ? undefined : true", options: { strictNullChecks: true } },
    { input: "true ? null : true", options: { strictNullChecks: true } },
    { input: "true ? false : true", expected: false, options: { luaTarget: LuaTarget.Lua51 } },
    { input: "false ? false : true", expected: true, options: { luaTarget: LuaTarget.Lua51 } },
    { input: "true ? undefined : true", options: { luaTarget: LuaTarget.Lua51 } },
    { input: "true ? false : true", expected: false, options: { luaTarget: LuaTarget.LuaJIT } },
    { input: "false ? false : true", expected: true, options: { luaTarget: LuaTarget.LuaJIT } },
    { input: "true ? undefined : true", options: { luaTarget: LuaTarget.LuaJIT } },
])("Ternary operator (%p)", ({ input, expected, options }) => {
    const result = util.transpileAndExecute(
        `const literalValue = 'literal';
        let variableValue:string;
        let maybeBooleanValue:string|boolean = false;
        let maybeUndefinedValue:string|undefined;
        return ${input};`,
        options,
    );

    expect(result).toBe(expected);
});

test.each([
    { expression: "inst.field", expected: 8 },
    { expression: "inst.field + 3", expected: 8 + 3 },
    { expression: "inst.field * 3", expected: 8 * 3 },
    { expression: "inst.field / 2", expected: 8 / 2 },
    { expression: "inst.field && 3", expected: 8 && 3 },
    { expression: "inst.field || 3", expected: 8 || 3 },
    { expression: "(inst.field + 3) & 3", expected: (8 + 3) & 3 },
    { expression: "inst.field | 3", expected: 8 | 3 },
    { expression: "inst.field << 3", expected: 8 << 3 },
    { expression: "inst.field >>> 1", expected: 8 >> 1 },
    { expression: "inst.field = 3", expected: 3 },
    { expression: `"abc" + inst.field`, expected: "abc8" },
])("Get accessor expression (%p)", ({ expression, expected }) => {
    const source =
        `class MyClass {` +
        `    public _field: number;` +
        `    public get field(): number { return this._field + 4; }` +
        `    public set field(v: number) { this._field = v; }` +
        `}` +
        `var inst = new MyClass();` +
        `inst._field = 4;` +
        `return ${expression};`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe(expected);
});

test.each([
    { expression: "= 4", expected: 4 + 4 },
    { expression: "-= 3", expected: 4 - 3 + 4 },
    { expression: "+= 3", expected: 4 + 3 + 4 },
    { expression: "*= 3", expected: 4 * 3 + 4 },
    { expression: "/= 2", expected: 4 / 2 + 4 },
    { expression: "&= 3", expected: (4 & 3) + 4 },
    { expression: "|= 3", expected: (4 | 3) + 4 },
    { expression: "<<= 3", expected: (4 << 3) + 4 },
    { expression: ">>>= 3", expected: (4 >> 3) + 4 },
])("Set accessorExpression (%p)", ({ expression, expected }) => {
    const source =
        `class MyClass {` +
        `    public _field: number = 4;` +
        `    public get field(): number { return this._field; }` +
        `    public set field(v: number) { this._field = v + 4; }` +
        `}` +
        `var inst = new MyClass();` +
        `inst.field ${expression};` +
        `return inst._field;`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe(expected);
});

test.each([
    { expression: "inst.baseField", expected: 7 },
    { expression: "inst.field", expected: 6 },
    { expression: "inst.superField", expected: 5 },
    { expression: "inst.superBaseField", expected: 4 },
])("Inherited accessors (%p)", ({ expression, expected }) => {
    const source =
        `class MyBaseClass {` +
        `    public _baseField: number;` +
        `    public get baseField(): number { return this._baseField + 6; }` +
        `    public set baseField(v: number) { this._baseField = v; }` +
        `}` +
        `class MyClass extends MyBaseClass {` +
        `    public _field: number;` +
        `    public get field(): number { return this._field + 4; }` +
        `    public set field(v: number) { this._field = v; }` +
        `}` +
        `class MySuperClass extends MyClass {` +
        `    public _superField: number;` +
        `    public get superField(): number { return this._superField + 2; }` +
        `    public set superField(v: number) { this._superField = v; }` +
        `    public get superBaseField() { return this.baseField - 3; }` +
        `}` +
        `var inst = new MySuperClass();` +
        `inst.baseField = 1;` +
        `inst.field = 2;` +
        `inst.superField = 3;` +
        `return ${expression};`;

    const result = util.transpileAndExecute(source);
    expect(result).toBe(expected);
});

test.each([
    { expression: "return x.value;", expected: 1 },
    { expression: "x.value = 3; return x.value;", expected: 3 },
])("Union accessors (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(
        `class A{ get value(){ return this.v || 1; } set value(v){ this.v = v; } v: number; }
        class B{ get value(){ return this.v || 2; } set value(v){ this.v = v; } v: number; }
        let x: A|B = new A();
        ${expression}`,
    );

    expect(result).toBe(expected);
});

test.each([
    { expression: "i++", expected: 10 },
    { expression: "i--", expected: 10 },
    { expression: "++i", expected: 11 },
    { expression: "--i", expected: 9 },
])("Incrementor value (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(`let i = 10; return ${expression};`);

    expect(result).toBe(expected);
});

test.each([
    { lambda: "a++", expected: "val3" },
    { lambda: "a--", expected: "val3" },
    { lambda: "--a", expected: "val2" },
    { lambda: "++a", expected: "val4" },
])("Template string expression (%p)", ({ lambda, expected }) => {
    const result = util.transpileAndExecute("let a = 3; return `val${" + lambda + "}`;");

    expect(result).toEqual(expected);
});

test.each([{ expression: "x = y", expected: "y" }, { expression: "x += y", expected: "xy" }])(
    "Assignment expressions (%p)",
    ({ expression, expected }) => {
        const result = util.transpileAndExecute(`let x = "x"; let y = "y"; return ${expression};`);
        expect(result).toBe(expected);
    },
);

test.each([
    { expression: "x = o.p", expected: "o" },
    { expression: "x = a[0]", expected: "a" },
    { expression: "x = y = o.p", expected: "o" },
    { expression: "x = o.p", expected: "o" },
])("Assignment expressions using temp (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(
        `let x = "x";
        let y = "y";
        let o = {p: "o"};
        let a = ["a"];
        return ${expression};`,
    );
    expect(result).toBe(expected);
});

test.each([
    { expression: "o.p = x", expected: "x" },
    { expression: "a[0] = x", expected: "x" },
    { expression: "o.p = a[0]", expected: "a" },
    { expression: "o.p = a[0] = x", expected: "x" },
])("Property assignment expressions (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(
        `let x = "x";
        let o = {p: "o"};
        let a = ["a"];
        return ${expression};`,
    );
    expect(result).toBe(expected);
});

test.each([
    { expression: "x = t()", expected: "t0,t1" },
    { expression: "x = tr()", expected: "tr0,tr1" },
    { expression: "[x[1], x[0]] = t()", expected: "t0,t1" },
    { expression: "[x[1], x[0]] = tr()", expected: "tr0,tr1" },
    { expression: "x = [y[1], y[0]]", expected: "y1,y0" },
    { expression: "[x[0], x[1]] = [y[1], y[0]]", expected: "y1,y0" },
])("Tuple assignment expressions (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(
        `let x: [string, string] = ["x0", "x1"];
        let y: [string, string] = ["y0", "y1"];
        function t(): [string, string] { return ["t0", "t1"] };
        /** @tupleReturn */
        function tr(): [string, string] { return ["tr0", "tr1"] };
        const r = ${expression};
        return \`\${r[0]},\${r[1]}\``,
    );
    expect(result).toBe(expected);
});

test("Block expression", () => {
    const result = util.transpileAndExecute(`let a = 4; {let a = 42; } return a;`);
    expect(result).toBe(4);
});

test("Non-null expression", () => {
    const result = util.transpileAndExecute(`function abc(): number | undefined { return 3; }
        const a: number = abc()!;
        return a;`);
    expect(result).toBe(3);
});

test("Unknown unary postfix error", () => {
    const transformer = util.makeTestTransformer();

    const mockExpression: any = {
        operand: ts.createLiteral(false),
        operator: ts.SyntaxKind.AsteriskToken,
    };

    expect(() =>
        transformer.transformPostfixUnaryExpression(mockExpression as ts.PostfixUnaryExpression),
    ).toThrowWithMessage(TranspileError, "Unsupported unary postfix operator kind: AsteriskToken");
});

test("Unknown unary postfix error", () => {
    const transformer = util.makeTestTransformer();

    const mockExpression: any = {
        operand: ts.createLiteral(false),
        operator: ts.SyntaxKind.AsteriskToken,
    };

    expect(() =>
        transformer.transformPrefixUnaryExpression(mockExpression as ts.PrefixUnaryExpression),
    ).toThrowWithMessage(TranspileError, "Unsupported unary prefix operator kind: AsteriskToken");
});

test("Incompatible fromCodePoint expression error", () => {
    const transformer = util.makeTestTransformer(LuaTarget.LuaJIT);

    const identifier = ts.createIdentifier("fromCodePoint");
    expect(() => transformer.transformStringExpression(identifier)).toThrowWithMessage(
        TranspileError,
        "string property fromCodePoint is/are not supported for target Lua jit.",
    );
});

test("Unknown string expression error", () => {
    const transformer = util.makeTestTransformer(LuaTarget.LuaJIT);

    const identifier = ts.createIdentifier("abcd");
    expect(() => transformer.transformStringExpression(identifier)).toThrowWithMessage(
        TranspileError,
        "string property abcd is/are not supported for target Lua jit.",
    );
});

test("Unsupported array function error", () => {
    const transformer = util.makeTestTransformer();

    const mockNode: any = {
        kind: ts.SyntaxKind.CallExpression,
        arguments: [],
        caller: ts.createLiteral(false),
        expression: {
            name: ts.createIdentifier("unknownFunction"),
            expression: ts.createLiteral(false),
        },
    };

    expect(() =>
        transformer.transformArrayCallExpression(mockNode as ts.CallExpression),
    ).toThrowWithMessage(TranspileError, "Unsupported property on array: unknownFunction");
});

test("Unsupported math property error", () => {
    const transformer = util.makeTestTransformer();

    expect(() =>
        transformer.transformMathExpression(ts.createIdentifier("unknownProperty")),
    ).toThrowWithMessage(TranspileError, "Unsupported property on math: unknownProperty");
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

    expect(() =>
        transformer.transformObjectLiteral(mockObject as ts.ObjectLiteralExpression),
    ).toThrowWithMessage(TranspileError, "Unsupported object literal element kind: FalseKeyword");
});
