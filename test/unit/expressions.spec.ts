import { Expect, Test, TestCase } from "alsatian";

import * as ts from "typescript";
import {LuaTranspiler, TranspileError} from "../../dist/Transpiler";

const dummyChecker = {getTypeAtLocation: function() {return {};}}
function transpileString(str: string): string {
    const file = ts.createSourceFile("", str, ts.ScriptTarget.Latest);
    const result = LuaTranspiler.transpileSourceFile(file, dummyChecker, false);
    return result.trim();
}

export class ExpressionTests {

    @TestCase("i++", "i=i+1")
    @TestCase("++i", "i=i+1")
    @TestCase("i--", "i=i-1")
    @TestCase("--i", "i=i-1")
    @TestCase("!a", "not a")
    @TestCase("-a", "-a")
    @Test("Unary expressions basic")
    public unaryBasic(input: string, lua: string) {
        Expect(transpileString(input)).toBe(lua);
    }

    @TestCase("1+1", "1+1")
    @TestCase("1-1", "1-1")
    @TestCase("1*1", "1*1")
    @TestCase("1/1", "1/1")
    @TestCase("1%1", "1%1")
    @TestCase("1==1", "1==1")
    @Test("Binary expressions basic")
    public binary(input: string, lua: string) {
        Expect(transpileString(input)).toBe(lua);
    }

    @TestCase("a+=b", "a=a+b")
    @TestCase("a-=b", "a=a-b")
    @TestCase("a*=b", "a=a*b")
    @TestCase("a/=b", "a=a/b")
    @TestCase("a&b", "bit.band(a,b)")
    @TestCase("a|b", "bit.bor(a,b)")
    @Test("Binary expressions overridden operators")
    public binaryOperatorOverride(input: string, lua: string) {
        Expect(transpileString(input)).toBe(lua);
    }

    @TestCase("1+1", "1+1")
    @TestCase("-1+1", "-1+1")
    @TestCase("1*30+4", "(1*30)+4")
    @TestCase("1*(3+4)", "1*(3+4)")
    @TestCase("1*(3+4*2)", "1*(3+(4*2))")
    @Test("Binary expressions ordering parentheses")
    public binaryParentheses(input: string, lua: string) {
        Expect(transpileString(input)).toBe(lua);
    }

    @TestCase("1 + a ? 3*a : c", "TS_ITE(1+a,function() return 3*a end,function() return c end)")
    @TestCase("a ? b : c", "TS_ITE(a,function() return b end,function() return c end)")
    @Test("Ternary operator")
    public conditional(input: string, lua: string) {
        Expect(transpileString(input)).toBe(lua);
    }
}