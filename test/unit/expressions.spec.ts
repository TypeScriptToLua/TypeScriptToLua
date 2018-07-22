import { Expect, Test, TestCase } from "alsatian";
import { LuaTarget } from "../../src/Transpiler";

import * as ts from "typescript";
import * as util from "../src/util";

export class ExpressionTests {

    @TestCase("i++", "i=i+1")
    @TestCase("++i", "i=i+1")
    @TestCase("i--", "i=i-1")
    @TestCase("--i", "i=i-1")
    @TestCase("!a", "(not a)")
    @TestCase("-a", "-a")
    @TestCase("delete tbl['test']", "tbl[\"test\"]=nil")
    @TestCase("delete tbl.test", "tbl.test=nil")
    @Test("Unary expressions basic")
    public unaryBasic(input: string, lua: string) {
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
    public binaryNum(input: string, output: number) {
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
    public binaryBool(input: string, expected: any) {
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
    public binaryIn(input: string) {
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
    public binaryOperatorOverride(input: string, expected: number) {
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
    public bitOperatorOverride51(input: string, lua: string) {
        // Bit operations not supported in 5.1, expect an exception
        Expect(() => util.transpileString(input, { luaTarget: LuaTarget.Lua51, luaLibImport: "none" }))
            .toThrow();
    }

    @TestCase("~a", "bit.bnot(a)")
    @TestCase("a&b", "bit.band(a,b)")
    @TestCase("a&=b", "a = bit.band(a,b)")
    @TestCase("a|b", "bit.bor(a,b)")
    @TestCase("a|=b", "a = bit.bor(a,b)")
    @TestCase("a^b", "bit.bxor(a,b)")
    @TestCase("a^=b", "a = bit.bxor(a,b)")
    @TestCase("a<<b", "bit.lshift(a,b)")
    @TestCase("a<<=b", "a = bit.lshift(a,b)")
    @TestCase("a>>b", "bit.rshift(a,b)")
    @TestCase("a>>=b", "a = bit.rshift(a,b)")
    @TestCase("a>>>b", "bit.arshift(a,b)")
    @TestCase("a>>>=b", "a = bit.arshift(a,b)")
    @Test("Bitop [JIT]")
    public bitOperatorOverrideJIT(input: string, lua: string) {
        Expect(util.transpileString(input, { luaTarget: LuaTarget.LuaJIT, luaLibImport: "none" })).toBe(lua);
    }

    @TestCase("~a", "bit32.bnot(a)")
    @TestCase("a&b", "bit32.band(a,b)")
    @TestCase("a&=b", "a = bit32.band(a,b)")
    @TestCase("a|b", "bit32.bor(a,b)")
    @TestCase("a|=b", "a = bit32.bor(a,b)")
    @TestCase("a^b", "bit32.bxor(a,b)")
    @TestCase("a^=b", "a = bit32.bxor(a,b)")
    @TestCase("a<<b", "bit32.lshift(a,b)")
    @TestCase("a<<=b", "a = bit32.lshift(a,b)")
    @TestCase("a>>b", "bit32.rshift(a,b)")
    @TestCase("a>>=b", "a = bit32.rshift(a,b)")
    @TestCase("a>>>b", "bit32.arshift(a,b)")
    @TestCase("a>>>=b", "a = bit32.arshift(a,b)")
    @Test("Bitop [5.2]")
    public bitOperatorOverride52(input: string, lua: string) {
        Expect(util.transpileString(input, { luaTarget: LuaTarget.Lua52, luaLibImport: "none" })).toBe(lua);
    }

    @TestCase("~a", "~a")
    @TestCase("a&b", "a & b")
    @TestCase("a&=b", "a = a & b")
    @TestCase("a|b", "a | b")
    @TestCase("a|=b", "a = a | b")
    @TestCase("a^b", "a ~ b")
    @TestCase("a^=b", "a = a ~ b")
    @TestCase("a<<b", "a << b")
    @TestCase("a<<=b", "a = a << b")
    @TestCase("a>>b", "a >> b")
    @TestCase("a>>=b", "a = a >> b")
    @Test("Bitop [5.3]")
    public bitOperatorOverride53(input: string, lua: string) {
        Expect(util.transpileString(input, { luaTarget: LuaTarget.Lua53, luaLibImport: "none" })).toBe(lua);
    }

    @TestCase("a>>>b")
    @TestCase("a>>>=b")
    @Test("Unsupported bitop 5.3")
    public bitOperatorOverride53Unsupported(input: string) {
        Expect(() => util.transpileString(input, { luaTarget: LuaTarget.Lua53, luaLibImport: "none" }))
            .toThrowError(Error, "Bitwise operator >>> not supported in Lua 5.3");
    }

    @TestCase("1+1", "1+1")
    @TestCase("-1+1", "-1+1")
    @TestCase("1*30+4", "(1*30)+4")
    @TestCase("1*(3+4)", "1*(3+4)")
    @TestCase("1*(3+4*2)", "1*(3+(4*2))")
    @Test("Binary expressions ordering parentheses")
    public binaryParentheses(input: string, lua: string) {
        Expect(util.transpileString(input)).toBe(lua);
    }

    @Test("Null Expression")
    public nullExpression() {
        Expect(util.transpileString("null")).toBe("nil");
    }

    @Test("Undefined Expression")
    public undefinedExpression() {
        Expect(util.transpileString("undefined")).toBe("nil");
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
    public getAccessorBinary(expression: string, expected: any) {
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
    public setAccessorBinary(expression: string, expected: any) {
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

    // ====================================
    // Test expected errors
    // ====================================

    @Test("Unknown unary postfix error")
    public unknownUnaryPostfixError() {
        const transpiler = util.makeTestTranspiler();

        const mockExpression: any = {
            operand: ts.createLiteral(false),
            operator: ts.SyntaxKind.AsteriskToken,
        };

        Expect(() => transpiler.transpilePostfixUnaryExpression(mockExpression as ts.PostfixUnaryExpression))
            .toThrowError(Error, "Unsupported unary postfix: AsteriskToken");
    }

    @Test("Unknown unary postfix error")
    public unknownUnaryPrefixError() {
        const transpiler = util.makeTestTranspiler();

        const mockExpression: any = {
            operand: ts.createLiteral(false),
            operator: ts.SyntaxKind.AsteriskToken,
        };

        Expect(() => transpiler.transpilePrefixUnaryExpression(mockExpression as ts.PrefixUnaryExpression))
            .toThrowError(Error, "Unsupported unary prefix: AsteriskToken");
    }

    @Test("Incompatible fromCodePoint expression error")
    public incompatibleFromCodePointExpression() {
        const transpiler = util.makeTestTranspiler(LuaTarget.LuaJIT);

        const identifier = ts.createIdentifier("fromCodePoint");
        Expect(() => transpiler.transpileStringExpression(identifier))
            .toThrowError(Error, "Unsupported string property fromCodePoint, is not supported in Lua JIT.");
    }

    @Test("Unknown string expression error")
    public unknownStringExpression() {
        const transpiler = util.makeTestTranspiler(LuaTarget.LuaJIT);

        const identifier = ts.createIdentifier("abcd");
        Expect(() => transpiler.transpileStringExpression(identifier))
            .toThrowError(Error, "Unsupported string property abcd, is not supported in Lua JIT.");
    }

    @Test("Unsupported array function error")
    public unsupportedArrayFunctionError() {
        const transpiler = util.makeTestTranspiler();

        const mockNode: any = {
            arguments: [],
            caller: ts.createLiteral(false),
            expression: {name: ts.createIdentifier("unknownFunction"), expression: ts.createLiteral(false)},
        };

        Expect(() => transpiler.transpileArrayCallExpression(mockNode as ts.CallExpression))
            .toThrowError(Error, "Unsupported array function: unknownFunction");
    }

    @Test("Unsupported array property error")
    public unsupportedArrayPropertyError() {
        const transpiler = util.makeTestTranspiler();

        const mockNode: any = {
            name: ts.createIdentifier("unknownProperty"),
        };

        Expect(() => transpiler.transpileArrayProperty(mockNode as ts.PropertyAccessExpression))
            .toThrowError(Error, "Unsupported array property: unknownProperty");
    }

    @Test("Unsupported math property error")
    public unsupportedMathPropertyError() {
        const transpiler = util.makeTestTranspiler();

        Expect(() => transpiler.transpileMathExpression(ts.createIdentifier("unknownProperty")))
            .toThrowError(Error, "Unsupported math property: unknownProperty.");
    }

    @Test("Unsupported variable declaration type error")
    public unsupportedVariableDeclarationType() {
        const transpiler = util.makeTestTranspiler();

        const mockNode: any = {name: ts.createLiteral(false)};

        Expect(() => transpiler.transpileVariableDeclaration(mockNode as ts.VariableDeclaration))
            .toThrowError(Error, "Unsupported variable declaration type: FalseKeyword");
    }

    @Test("Unsupported object literal element error")
    public unsupportedObjectLiteralElementError() {
        const transpiler = util.makeTestTranspiler();

        const mockObject: any = {
            properties: [{
                kind: ts.SyntaxKind.FalseKeyword,
                name: ts.createIdentifier("testProperty"),
            }],
        };

        Expect(() => transpiler.transpileObjectLiteral(mockObject as ts.ObjectLiteralExpression))
            .toThrowError(Error, "Encountered unsupported object literal element: FalseKeyword.");
    }
}
