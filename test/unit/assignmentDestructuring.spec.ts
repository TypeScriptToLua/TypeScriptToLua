import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";
import { LuaTarget } from "../../src/Transpiler";

const tupleDestructuringTs = `
    declare function myFunc(): [number, string];
    let [a, b] = myFunc();`;

export class AssignmentDestructuringTests {

    @Test("Tuple destructuring [5.1]")
    public tupleDestructing51() {
        // Transpile
        const lua = util.transpileString(
            tupleDestructuringTs, {luaTarget: LuaTarget.Lua51, luaLibImport: "none"}
        );
        // Assert
        Expect(lua).toBe(`local a,b=unpack(myFunc())`);
    }

    @Test("Tuple destructuring [5.2]")
    public tupleDestructing52() {
        // Transpile
        const lua = util.transpileString(
            tupleDestructuringTs, {luaTarget: LuaTarget.Lua52, luaLibImport: "none"}
        );
        // Assert
        Expect(lua).toBe(`local a,b=table.unpack(myFunc())`);
    }

    @Test("Tuple destructuring [5.3]")
    public tupleDestructing53() {
        // Transpile
        const lua = util.transpileString(
            tupleDestructuringTs, {luaTarget: LuaTarget.Lua53, luaLibImport: "none"}
        );
        // Assert
        Expect(lua).toBe(`local a,b=table.unpack(myFunc())`);
    }   
    
    @Test("Tuple destructuring [JIT]")
    public tupleDestructingJIT() {
        // Transpile
        const lua = util.transpileString(
            tupleDestructuringTs, {luaTarget: LuaTarget.LuaJIT, luaLibImport: "none"}
        );
        // Assert
        Expect(lua).toBe(`local a,b=table.unpack(myFunc())`);
    }
}
