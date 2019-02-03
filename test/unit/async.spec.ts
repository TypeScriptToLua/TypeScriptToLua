import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/TranspileError";

export class AsyncTests {

    @Test("async function declaration")
    public asyncFunctionDeclaration(): void {
        const testCode = `
            async function a() { }
        `;
        Expect(util.transpileString(testCode)).toBe(`require("lualib_bundle\");\na = __TS__Async(function()\nend);`);
    }

    @Test("async arrow function")
    public asyncArrowFunction(): void {
        const testCode = `
            a = async ( b:number ) => { }
        `;
      // tslint:disable-next-line:max-line-length
        Expect(util.transpileString(testCode)).toBe(`require("lualib_bundle\");\na = __TS__Async(function(____, b)\nend);`);
    }

    @Test("async method")
    public asyncMethod(): void {
        const testCode = `
        class A {
            public async a() => { }
            static public async b() => { }
         }
        `;

        // tslint:disable-next-line:max-line-length
        Expect(util.transpileString(testCode)).toBe("require(\"lualib_bundle\");\nA = A or {};\nA.__index = A;\nA.new = function(construct, ...)\n    local self = setmetatable({}, A);\n    if construct and A.constructor then\n        A.constructor(self, ...);\n    end\n    return self;\nend;\nA.constructor = function(self)\nend;\nA.a = __TS__Async(function(self)\nend);\ndo\nend\nasync;\nb();\ndo\nend");
    }

    @Test("await expression")
    public asyncAwaitExpression(): void {
        const testCode = `
            async function a() {
              const b = await 5;
              await;
              await( "test" );
            }
        `;
        // tslint:disable-next-line:max-line-length
        Expect(util.transpileString(testCode)).toBe("require(\"lualib_bundle\");\na = __TS__Async(function()\n    local b = __TS__Await(5);\n    __TS__Await();\n    __TS__Await((\"test\"));\nend);");
    }
}
