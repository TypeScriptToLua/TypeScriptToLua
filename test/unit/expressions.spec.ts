import { Expect, Test, TestCase } from "alsatian";

import * as ts from "typescript";
import { LuaTranspiler, TranspileError } from "../../dist/Transpiler";

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
    @TestCase("2 in obj", "Unsupported binary operator kind: in")
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
    public binary(input: string, lua: string) {
        Expect(util.transpileString(input)).toBe(lua);
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
        Expect(util.transpileString(input, util.dummyTypes.None, { luaTarget: 'JIT', dontRequireLualib: true })).toBe(lua);
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
        Expect(util.transpileString(input, util.dummyTypes.None, { luaTarget: '5.3', dontRequireLualib: true })).toBe(lua);
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
}
