import { Expect, Test, TestCase } from "alsatian";
import { TranspileError } from "../../src/Errors";
import { LuaTarget } from "../../src/Transpiler";

import * as ts from "typescript";
import * as util from "../src/util";

export class ExpressionTests {

    @TestCase("i++", "i = (i+1);")
    @TestCase("++i", "i = (i+1);")
    @TestCase("i--", "i = (i-1);")
    @TestCase("--i", "i = (i-1);")
    @TestCase("!a", "(not a);")
    @TestCase("-a", "-a;")
    @TestCase("delete tbl['test']", "tbl[\"test\"]=nil;")
    @TestCase("delete tbl.test", "tbl.test=nil;")
    @Test("Unary expressions basic")
    public unaryBasic(input: string, lua: string): void {
        Expect(util.transpileString(input)).toBe(lua);
    }

    @TestCase("3+4", 3 + 4)
    @TestCase("5-2", 5 - 2)
    @TestCase("6*3", 6 * 3)
    @TestCase("6**3", 6 ** 3)
    @TestCase("20/5", 20 / 5)
    @TestCase("15/10", 15 / 10)
    @TestCase("15%3", 15 % 3)
    @Test("Binary expressions basic numeric")
    public binaryNum(input: string, output: number): void {
        // Transpile
        const lua = util.transpileString(input);

        // Execute
        const result = util.executeLua(`return ${lua}`);

        // Assert
        Expect(result).toBe(output);
    }

    @TestCase("1==1", true)
    @TestCase("1===1", true)
    @TestCase("1!=1", false)
    @TestCase("1!==1", false)
    @TestCase("1>1", false)
    @TestCase("1>=1", true)
    @TestCase("1<1", false)
    @TestCase("1<=1", true)
    @TestCase("1&&1", 1)
    @TestCase("1||1", 1)
    @Test("Binary expressions basic boolean")
    public binaryBool(input: string, expected: any): void {
        // Transpile
        const lua = util.transpileString(input);

        // Execute
        const result = util.executeLua(`return ${lua}`);

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase("'key' in obj")
    @TestCase("'existingKey' in obj")
    @TestCase("0 in obj")
    @TestCase("9 in obj")
    @Test("Binary expression in")
    public binaryIn(input: string): void {
        // Transpile
        const lua = util.transpileString(input);

        // Execute
        const result = util.executeLua(`obj = { existingKey = 1 }\nreturn ${lua}`);

        // Assert
        Expect(result).toBe(eval(`let obj = { existingKey: 1 }; ${input}`));
    }

    @TestCase("a+=b", 5 + 3)
    @TestCase("a-=b", 5 - 3)
    @TestCase("a*=b", 5 * 3)
    @TestCase("a/=b", 5 / 3)
    @TestCase("a%=b", 5 % 3)
    @TestCase("a**=b", 5 ** 3)
    @Test("Binary expressions overridden operators")
    public binaryOperatorOverride(input: string, expected: number): void {
        const lua = util.transpileString(`let a = 5; let b = 3; ${input}; return a;`);

        const result = util.executeLua(lua);

        Expect(result).toBe(expected);
    }

    @TestCase("~b")
    @TestCase("a&b")
    @TestCase("a&=b")
    @TestCase("a|b")
    @TestCase("a|=b")
    @TestCase("a^b")
    @TestCase("a^=b")
    @TestCase("a<<b")
    @TestCase("a<<=b")
    @TestCase("a>>b")
    @TestCase("a>>=b")
    @TestCase("a>>>b")
    @TestCase("a>>>=b")
    @Test("Bitop [5.1]")
    public bitOperatorOverride51(input: string, lua: string): void {
        // Bit operations not supported in 5.1, expect an exception
        Expect(() => util.transpileString(input, { luaTarget: LuaTarget.Lua51, luaLibImport: "none" }))
            .toThrow();
    }

    @TestCase("~a", "bit.bnot(a);")
    @TestCase("a&b", "bit.band(a,b);")
    @TestCase("a&=b", "a = (bit.band(a,b));")
    @TestCase("a|b", "bit.bor(a,b);")
    @TestCase("a|=b", "a = (bit.bor(a,b));")
    @TestCase("a^b", "bit.bxor(a,b);")
    @TestCase("a^=b", "a = (bit.bxor(a,b));")
    @TestCase("a<<b", "bit.lshift(a,b);")
    @TestCase("a<<=b", "a = (bit.lshift(a,b));")
    @TestCase("a>>b", "bit.rshift(a,b);")
    @TestCase("a>>=b", "a = (bit.rshift(a,b));")
    @TestCase("a>>>b", "bit.arshift(a,b);")
    @TestCase("a>>>=b", "a = (bit.arshift(a,b));")
    @Test("Bitop [JIT]")
    public bitOperatorOverrideJIT(input: string, lua: string): void {
        Expect(util.transpileString(input, { luaTarget: LuaTarget.LuaJIT, luaLibImport: "none" })).toBe(lua);
    }

    @TestCase("~a", "bit32.bnot(a);")
    @TestCase("a&b", "bit32.band(a,b);")
    @TestCase("a&=b", "a = (bit32.band(a,b));")
    @TestCase("a|b", "bit32.bor(a,b);")
    @TestCase("a|=b", "a = (bit32.bor(a,b));")
    @TestCase("a^b", "bit32.bxor(a,b);")
    @TestCase("a^=b", "a = (bit32.bxor(a,b));")
    @TestCase("a<<b", "bit32.lshift(a,b);")
    @TestCase("a<<=b", "a = (bit32.lshift(a,b));")
    @TestCase("a>>b", "bit32.rshift(a,b);")
    @TestCase("a>>=b", "a = (bit32.rshift(a,b));")
    @TestCase("a>>>b", "bit32.arshift(a,b);")
    @TestCase("a>>>=b", "a = (bit32.arshift(a,b));")
    @Test("Bitop [5.2]")
    public bitOperatorOverride52(input: string, lua: string): void {
        Expect(util.transpileString(input, { luaTarget: LuaTarget.Lua52, luaLibImport: "none" })).toBe(lua);
    }

    @TestCase("~a", "~a;")
    @TestCase("a&b", "a & b;")
    @TestCase("a&=b", "a = (a & b);")
    @TestCase("a|b", "a | b;")
    @TestCase("a|=b", "a = (a | b);")
    @TestCase("a^b", "a ~ b;")
    @TestCase("a^=b", "a = (a ~ b);")
    @TestCase("a<<b", "a << b;")
    @TestCase("a<<=b", "a = (a << b);")
    @TestCase("a>>b", "a >> b;")
    @TestCase("a>>=b", "a = (a >> b);")
    @Test("Bitop [5.3]")
    public bitOperatorOverride53(input: string, lua: string): void {
        Expect(util.transpileString(input, { luaTarget: LuaTarget.Lua53, luaLibImport: "none" })).toBe(lua);
    }

    @TestCase("a>>>b")
    @TestCase("a>>>=b")
    @Test("Unsupported bitop 5.3")
    public bitOperatorOverride53Unsupported(input: string): void {
        Expect(() => util.transpileString(input, { luaTarget: LuaTarget.Lua53, luaLibImport: "none" }))
            .toThrowError(TranspileError, "Bitwise >>> operator is/are not supported for target Lua 5.3.");
    }

    @TestCase("1+1", "1+1;")
    @TestCase("-1+1", "-1+1;")
    @TestCase("1*30+4", "(1*30)+4;")
    @TestCase("1*(3+4)", "1*(3+4);")
    @TestCase("1*(3+4*2)", "1*(3+(4*2));")
    @Test("Binary expressions ordering parentheses")
    public binaryParentheses(input: string, lua: string): void {
        Expect(util.transpileString(input)).toBe(lua);
    }

    @Test("Null Expression")
    public nullExpression(): void {
        Expect(util.transpileString("null")).toBe("nil;");
    }

    @Test("Undefined Expression")
    public undefinedExpression(): void {
        Expect(util.transpileString("undefined")).toBe("nil;");
    }

    @TestCase("inst.field", 8)
    @TestCase("inst.field + 3", 8 + 3)
    @TestCase("inst.field * 3", 8 * 3)
    @TestCase("inst.field / 2", 8 / 2)
    @TestCase("inst.field && 3", 8 && 3)
    @TestCase("inst.field || 3", 8 || 3)
    @TestCase("(inst.field + 3) & 3", (8 + 3) & 3)
    @TestCase("inst.field | 3", 8 | 3)
    @TestCase("inst.field << 3", 8 << 3)
    @TestCase("inst.field >> 1", 8 >> 1)
    @TestCase(`"abc" + inst.field`, "abc8")
    @Test("Get accessor expression")
    public getAccessorBinary(expression: string, expected: any): void {
        const source = `class MyClass {`
                     + `    public _field: number;`
                     + `    public get field(): number { return this._field + 4; }`
                     + `    public set field(v: number) { this._field = v; }`
                     + `}`
                     + `var inst = new MyClass();`
                     + `inst._field = 4;`
                     + `return ${expression};`;

        // Transpile
        const lua = util.transpileString(source);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase("= 4", 4 + 4)
    @TestCase("-= 3", (4 - 3) + 4)
    @TestCase("+= 3", (4 + 3) + 4)
    @TestCase("*= 3", (4 * 3) + 4)
    @TestCase("/= 2", (4 / 2) + 4)
    @TestCase("&= 3", (4 & 3) + 4)
    @TestCase("|= 3", (4 | 3) + 4)
    @TestCase("<<= 3", (4 << 3) + 4)
    @TestCase(">>= 3", (4 >> 3) + 4)
    @Test("Set accessorExpression")
    public setAccessorBinary(expression: string, expected: any): void {
        const source = `class MyClass {`
                     + `    public _field: number = 4;`
                     + `    public get field(): number { return this._field; }`
                     + `    public set field(v: number) { this._field = v + 4; }`
                     + `}`
                     + `var inst = new MyClass();`
                     + `inst.field ${expression};`
                     + `return inst._field;`;

        // Transpile
        const lua = util.transpileString(source);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase("i++", 10)
    @TestCase("i--", 10)
    @TestCase("++i", 11)
    @TestCase("--i", 9)
    @Test("Incrementor value")
    public incrementorValue(expression: string, expected: number): void {
        const result = util.transpileAndExecute(`let i = 10; return ${expression};`);

        Expect(result).toBe(expected);
    }

    @TestCase("a++", "val3")
    @TestCase("a--", "val3")
    @TestCase("--a", "val2")
    @TestCase("++a", "val4")
    @Test("Template string expression")
    public templateStringExpression(lambda: string, expected: string): void {
        const result = util.transpileAndExecute("let a = 3; return `val${" + lambda + "}`;");

        Expect(result).toEqual(expected);
    }

    @TestCase("x = y", "y")
    @Test("Assignment expressions")
    public assignmentExpression(expression: string, expected: string): void {
        const result = util.transpileAndExecute(`let x = "x"; let y = "y"; return ${expression};`);
        Expect(result).toBe(expected);
    }

    @TestCase("x = o.p", "o")
    @TestCase("x = a[0]", "a")
    @TestCase("x = y = o.p", "o")
    @TestCase("x = o.p", "o")
    @Test("Assignment expressions using temp")
    public assignmentWithTempExpression(expression: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let x = "x";
            let y = "y";
            let o = {p: "o"};
            let a = ["a"];
            return ${expression};`);
        Expect(result).toBe(expected);
    }

    @TestCase("o.p = x", "x")
    @TestCase("a[0] = x", "x")
    @TestCase("o.p = a[0]", "a")
    @TestCase("o.p = a[0] = x", "x")
    @Test("Property assignment expressions")
    public propertyAssignmentExpression(expression: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let x = "x";
            let o = {p: "o"};
            let a = ["a"];
            return ${expression};`);
        Expect(result).toBe(expected);
    }

    @TestCase("x = t()", "t0,t1")
    @TestCase("x = tr()", "tr0,tr1")
    @TestCase("[x[1], x[0]] = t()", "t0,t1")
    @TestCase("[x[1], x[0]] = tr()", "tr0,tr1")
    @TestCase("x = [y[1], y[0]]", "y1,y0")
    @TestCase("[x[0], x[1]] = [y[1], y[0]]", "y1,y0")
    @Test("Tuple assignment expressions")
    public tupleAssignmentExpression(expression: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let x: [string, string] = ["x0", "x1"];
            let y: [string, string] = ["y0", "y1"];
            function t(): [string, string] { return ["t0", "t1"] };
            /** @tupleReturn */
            function tr(): [string, string] { return ["tr0", "tr1"] };
            const r = ${expression};
            return \`\${r[0]},\${r[1]}\``);
        Expect(result).toBe(expected);
    }

    @Test("Block expression")
    public blockExpresion(): void {
        const result = util.transpileAndExecute(`let a = 4; {let a = 42; } return a;`);
        Expect(result).toBe(4);
    }

    @Test("Non-null expression")
    public nonNullExpression(): void {
        const result = util.transpileAndExecute(`function abc(): number | undefined { return 3; }
            const a: number = abc()!;
            return a;`);
        Expect(result).toBe(3);
    }
    // ====================================
    // Test expected errors
    // ====================================

    @Test("Unknown unary postfix error")
    public unknownUnaryPostfixError(): void {
        const transpiler = util.makeTestTranspiler();

        const mockExpression: any = {
            operand: ts.createLiteral(false),
            operator: ts.SyntaxKind.AsteriskToken,
        };

        Expect(() => transpiler.transpilePostfixUnaryExpression(mockExpression as ts.PostfixUnaryExpression))
            .toThrowError(TranspileError, "Unsupported unary postfix operator kind: AsteriskToken");
    }

    @Test("Unknown unary postfix error")
    public unknownUnaryPrefixError(): void {
        const transpiler = util.makeTestTranspiler();

        const mockExpression: any = {
            operand: ts.createLiteral(false),
            operator: ts.SyntaxKind.AsteriskToken,
        };

        Expect(() => transpiler.transpilePrefixUnaryExpression(mockExpression as ts.PrefixUnaryExpression))
            .toThrowError(TranspileError, "Unsupported unary prefix operator kind: AsteriskToken");
    }

    @Test("Incompatible fromCodePoint expression error")
    public incompatibleFromCodePointExpression(): void {
        const transpiler = util.makeTestTranspiler(LuaTarget.LuaJIT);

        const identifier = ts.createIdentifier("fromCodePoint");
        Expect(() => transpiler.transpileStringExpression(identifier))
            .toThrowError(TranspileError, "string property fromCodePoint is/are not supported " +
                          "for target Lua jit.");
    }

    @Test("Unknown string expression error")
    public unknownStringExpression(): void {
        const transpiler = util.makeTestTranspiler(LuaTarget.LuaJIT);

        const identifier = ts.createIdentifier("abcd");
        Expect(() => transpiler.transpileStringExpression(identifier))
            .toThrowError(TranspileError, "string property abcd is/are not supported for target Lua jit.");
    }

    @Test("Unsupported array function error")
    public unsupportedArrayFunctionError(): void {
        const transpiler = util.makeTestTranspiler();

        const mockNode: any = {
            arguments: [],
            caller: ts.createLiteral(false),
            expression: {name: ts.createIdentifier("unknownFunction"), expression: ts.createLiteral(false)},
        };

        Expect(() => transpiler.transpileArrayCallExpression(mockNode as ts.CallExpression))
            .toThrowError(TranspileError, "Unsupported property on array: unknownFunction");
    }

    @Test("Unsupported array property error")
    public unsupportedArrayPropertyError(): void {
        const transpiler = util.makeTestTranspiler();

        const mockNode: any = {
            name: ts.createIdentifier("unknownProperty"),
        };

        Expect(() => transpiler.transpileArrayProperty(mockNode as ts.PropertyAccessExpression))
            .toThrowError(TranspileError, "Unsupported property on array: unknownProperty");
    }

    @Test("Unsupported math property error")
    public unsupportedMathPropertyError(): void {
        const transpiler = util.makeTestTranspiler();

        Expect(() => transpiler.transpileMathExpression(ts.createIdentifier("unknownProperty")))
            .toThrowError(TranspileError, "Unsupported property on math: unknownProperty");
    }

    @Test("Unsupported variable declaration type error")
    public unsupportedVariableDeclarationType(): void {
        const transpiler = util.makeTestTranspiler();

        const mockNode: any = {name: ts.createLiteral(false)};

        Expect(() => transpiler.transpileVariableDeclaration(mockNode as ts.VariableDeclaration))
            .toThrowError(TranspileError, "Unsupported variable declaration kind: FalseKeyword");
    }

    @Test("Unsupported object literal element error")
    public unsupportedObjectLiteralElementError(): void {
        const transpiler = util.makeTestTranspiler();

        const mockObject: any = {
            properties: [{
                kind: ts.SyntaxKind.FalseKeyword,
                name: ts.createIdentifier("testProperty"),
            }],
        };

        Expect(() => transpiler.transpileObjectLiteral(mockObject as ts.ObjectLiteralExpression))
            .toThrowError(TranspileError, "Unsupported object literal element kind: FalseKeyword");
    }
}
