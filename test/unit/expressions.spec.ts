import { Expect, Test, TestCase, FocusTest } from "alsatian";
import { LuaTarget } from "../../src/Transpiler";

import * as ts from "typescript";
import * as util from "../src/util";

export class ExpressionTests {

    @TestCase("i++", "i=i+1")
    @TestCase("++i", "i=i+1")
    @TestCase("i--", "i=i-1")
    @TestCase("--i", "i=i-1")
    @TestCase("!a", "not a")
    @TestCase("-a", "-a")
    @TestCase("delete tbl['test']", "tbl[\"test\"]=nil")
    @TestCase("delete tbl.test", "tbl.test=nil")
    @Test("Unary expressions basic")
    public unaryBasic(input: string, lua: string) {
        Expect(util.transpileString(input)).toBe(lua);
    }

    @TestCase("obj instanceof someClass", "Unsupported binary operator kind: instanceof")
    @TestCase("typeof obj", "Unsupported expression kind: TypeOfExpression")
    @Test("Prohibted Expressions")
    public prohibtedExpressions(input: string, expectedError: string) {
        Expect(() => {
            util.transpileString(input);
        }).toThrowError(Error, expectedError);
    }

    @TestCase("1+1", "1+1")
    @TestCase("1-1", "1-1")
    @TestCase("1*1", "1*1")
    @TestCase("1/1", "1/1")
    @TestCase("1%1", "1%1")
    @TestCase("1==1", "1==1")
    @TestCase("1===1", "1==1")
    @TestCase("1!=1", "1~=1")
    @TestCase("1!==1", "1~=1")
    @TestCase("1>1", "1>1")
    @TestCase("1>=1", "1>=1")
    @TestCase("1<1", "1<1")
    @TestCase("1<=1", "1<=1")
    @TestCase("1&&1", "1 and 1")
    @TestCase("1||1", "1 or 1")
    @Test("Binary expressions basic")
    public binary(input: string, output: string) {
        // Transpile
        const lua = util.transpileString(input);

        // Execute
        const result = util.executeLua(`return ${lua}`);

        // Assert
        Expect(lua).toBe(output);
        Expect(result).toBe(eval(input));
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

    @TestCase("a+=b", "a=a+b")
    @TestCase("a-=b", "a=a-b")
    @TestCase("a*=b", "a=a*b")
    @TestCase("a/=b", "a=a/b")
    @Test("Binary expressions overridden operators")
    public binaryOperatorOverride(input: string, lua: string) {
        Expect(util.transpileString(input)).toBe(lua);
    }

    @TestCase("a&b", "bit.band(a,b)")
    @TestCase("a&=b", "a=bit.band(a,b)")
    @TestCase("a|b", "bit.bor(a,b)")
    @TestCase("a|=b", "a=bit.bor(a,b)")
    @TestCase("a<<b", "bit.lshift(a,b)")
    @TestCase("a<<=b", "a=bit.lshift(a,b)")
    @TestCase("a>>b", "bit.arshift(a,b)")
    @TestCase("a>>=b", "a=bit.arshift(a,b)")
    @TestCase("a>>>b", "bit.rshift(a,b)")
    @TestCase("a>>>=b", "a=bit.rshift(a,b)")
    @Test("Bitop [JIT]")
    public bitOperatorOverrideJIT(input: string, lua: string) {
        Expect(util.transpileString(input, { luaTarget: "JIT", dontRequireLuaLib: true })).toBe(lua);
    }

    @TestCase("a&b", "a&b")
    @TestCase("a&=b", "a=a&b")
    @TestCase("a|b", "a|b")
    @TestCase("a|=b", "a=a|b")
    @TestCase("a<<b", "a<<b")
    @TestCase("a<<=b", "a=a<<b")
    @TestCase("a>>b", "a>>b")
    @TestCase("a>>=b", "a=a>>b")
    @TestCase("a>>>b", "a>>>b")
    @TestCase("a>>>=b", "a=a>>>b")
    @Test("Bitop [5.3]")
    public bitOperatorOverride53(input: string, lua: string) {
        Expect(util.transpileString(input, { luaTarget: "5.3", dontRequireLuaLib: true })).toBe(lua);
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

    @TestCase("1 + a ? 3*a : c", "TS_ITE(1+a,function() return 3*a end,function() return c end)")
    @TestCase("a ? b : c", "TS_ITE(a,function() return b end,function() return c end)")
    @Test("Ternary operator")
    public conditional(input: string, lua: string) {
        Expect(util.transpileString(input)).toBe(lua);
    }

    @Test("Arrow Function Expression")
    public arrowFunctionExpression() {
        // Transpile
        const lua = util.transpileString(`let add = (a, b) => a+b; return add(1,2);`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(3);
    }

    @TestCase([])
    @TestCase([5])
    @TestCase([1, 2])
    @Test("Arrow Default Values")
    public arrowFunctionDefaultValues(inp: number[]) {
        // Default value is 3 for v1
        const v1 = inp.length > 0 ? inp[0] : 3;
        // Default value is 4 for v2
        const v2 = inp.length > 1 ? inp[1] : 4;

        const callArgs = inp.join(",");

        // Transpile
        const lua = util.transpileString(`let add = (a: number = 3, b: number = 4) => { return a+b; }`
                                       + `return add(${callArgs});`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(v1 + v2);
    }

    @Test("Function Expression")
    public functionExpression() {
        // Transpile
        const lua = util.transpileString(`let add = function(a, b) {return a+b}; return add(1,2);`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(3);
    }

    @TestCase([], 7)
    @TestCase([5], 9)
    @TestCase([1, 2], 3)
    @Test("Arrow Default Values")
    public functionExpressionDefaultValues(inp: number[]) {
        // Default value is 3 for v1
        const v1 = inp.length > 0 ? inp[0] : 3;
        // Default value is 4 for v2
        const v2 = inp.length > 1 ? inp[1] : 4;

        const callArgs = inp.join(",");

        // Transpile
        const lua = util.transpileString(`let add = function(a: number = 3, b: number = 4) { return a+b; }`
                                       + `return add(${callArgs});`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(v1 + v2);
    }

    @TestCase("inst.field", 8)
    @TestCase("inst.field + 3", 8 + 3)
    @TestCase("inst.field * 3", 8 * 3)
    @TestCase("inst.field / 3", 8 / 3)
    @TestCase("inst.field && 3", 8 && 3)
    @TestCase("inst.field || 3", 8 || 3)
    // @TestCase("inst.field & 3", 8 & 3)
    // @TestCase("inst.field | 3", 8 | 3)
    // @TestCase("inst.field << 3", 8 << 3)
    // @TestCase("inst.field >> 1", 8 >> 1)
    @TestCase(`"abc" + inst.field`, "abc8")
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
    @TestCase("+= 3", 4 + 3 + 4)
    @TestCase("*= 3", 4 * 3 + 4)
    @TestCase("/= 3", 4 / 3 + 4)
    // @TestCase("&= 3", 4 & 3 + 4)
    // @TestCase("|= 3", 4 | 3 + 4)
    // @TestCase("<<= 3", 4 << 3 + 4)
    // @TestCase(">>= 3", 4 >> 3 + 4)
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
}
