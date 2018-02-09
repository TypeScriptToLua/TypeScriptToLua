import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util"

export class LuaLoopTests {

    @TestCase(`
        namespace testOuter {
            function outerFunc() {
                
            }
            namespace testInner {
                export function publicTestFunc() {

                }
                function privateTestFunc() {

                }
            }
        }

        export class TestClass {

        }
    `)
    @Test("namespace")
    public namespace<T>(inp: string) {
        // Transpile
        let lua = util.transpileString(inp, util.dummyTypes.Object);

        // Assert
        Expect(lua).toBe("");
    }
}
