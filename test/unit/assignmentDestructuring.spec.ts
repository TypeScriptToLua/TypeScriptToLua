import { Expect, Test, TestCase } from "alsatian";
import { LuaTarget, LuaLibImportKind } from "../../src/CompilerOptions";
import * as util from "../src/util";

export class AssignmentDestructuringTests {

    private readonly assignmentDestruturingTs = `
        declare function myFunc(): [number, string];
        let [a, b] = myFunc();`;

    @Test("Assignment destructuring [5.1]")
    public assignmentDestructuring51(): void {
        // Transpile
        const lua = util.transpileString(
            this.assignmentDestruturingTs, {luaTarget: LuaTarget.Lua51, luaLibImport: LuaLibImportKind.None}
        );
        // Assert
        Expect(lua).toBe(`local a, b = unpack(myFunc());`);
    }

    @Test("Assignment destructuring [5.2]")
    public tupleDestructing52(): void {
        // Transpile
        const lua = util.transpileString(
            this.assignmentDestruturingTs, {luaTarget: LuaTarget.Lua52, luaLibImport: LuaLibImportKind.None}
        );
        // Assert
        Expect(lua).toBe(`local a, b = table.unpack(myFunc());`);
    }

    @Test("Assignment destructuring [JIT]")
    public assignmentDestructuringJIT(): void {
        // Transpile
        const lua = util.transpileString(
            this.assignmentDestruturingTs, {luaTarget: LuaTarget.LuaJIT, luaLibImport: LuaLibImportKind.None}
        );
        // Assert
        Expect(lua).toBe(`local a, b = unpack(myFunc());`);
    }

    @TestCase("function foo(): [] { return []; }; let [] = foo();")
    @TestCase("let [] = ['a', 'b', 'c'];")
    @TestCase("let [] = [];")
    @TestCase("let [] = [] = [];")
    @TestCase("function foo(): [] { return []; }; [] = foo();")
    @TestCase("[] = ['a', 'b', 'c'];")
    @TestCase("[] = [];")
    @TestCase("[] = [] = [];")
    @Test("Empty destructuring")
    public emptyDestructuring(code: string): void {
        Expect(() => util.transpileAndExecute(code)).not.toThrow();
    }

    @Test("Union destructuring")
    public unionDestructuring(): void {
        const code =
            `function foo(): [string] | [] { return ["bar"]; }
            let x: string;
            [x] = foo();
            return x;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }
}
