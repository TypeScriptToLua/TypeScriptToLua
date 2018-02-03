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

    // Test order-preserving parentheses
    @TestCase("1+1", "1+1")
    @TestCase("-1+1", "-1+1")
    @TestCase("1*3+4", "(1*3)+4")
    @TestCase("1*(3+4)", "1*(3+4)")
    @TestCase("1*(3+4*2)", "1*(3+(4*2))")
    @Test("Expression order")
    public orderTest(input: string, lua: string) {
        Expect(transpileString(input)).toBe(lua);
    }
}