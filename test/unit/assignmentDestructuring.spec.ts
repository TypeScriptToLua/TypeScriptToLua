import { Expect, Test, TestCase } from "alsatian";
import { LuaTarget } from "../../src/CompilerOptions";
import * as util from "../src/util";

export class AssignmentDestructuringTests {

    private readonly assignmentDestruturingTs = `
        declare function myFunc(): [number, string];
        let [a, b] = myFunc();`;

    @Test("Assignment destructuring [5.1]")
    public assignmentDestructuring51(): void {
        // Transpile
        const lua = util.transpileString(
            this.assignmentDestruturingTs, {luaTarget: LuaTarget.Lua51, luaLibImport: "none"}
        );
        // Assert
        Expect(lua).toBe(`local a, b;\na, b = unpack(myFunc());`);
    }

    @Test("Assignment destructuring [5.2]")
    public tupleDestructing52(): void {
        // Transpile
        const lua = util.transpileString(
            this.assignmentDestruturingTs, {luaTarget: LuaTarget.Lua52, luaLibImport: "none"}
        );
        // Assert
        Expect(lua).toBe(`local a, b;\na, b = table.unpack(myFunc());`);
    }

    @Test("Assignment destructuring [JIT]")
    public assignmentDestructuringJIT(): void {
        // Transpile
        const lua = util.transpileString(
            this.assignmentDestruturingTs, {luaTarget: LuaTarget.LuaJIT, luaLibImport: "none"}
        );
        // Assert
        Expect(lua).toBe(`local a, b;\na, b = unpack(myFunc());`);
    }
}
