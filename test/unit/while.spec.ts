import { Expect, Test, TestCase, FocusTest } from "alsatian";
import * as util from "../src/util";

export class WhileTests {

    @Test("While loop")
    public defaultWhile() {
        const input = `declare var a: number;
        while (a < 10) {
            a++;
        }`;

        const expected = `while a<10 do
            local ____continue = false
            repeat
                a=a+1
                ____continue = true
            until true
            if not ____continue then break end
        end`;

        util.expectCodeEqual(util.transpileString(input), expected);
    }

    @Test("Do While")
    public doWhile() {
        const input = `declare var a: number;
        do {
            a++;
        } while (a < 10);`;

        const expected = `repeat
            local ____continue = false
            repeat
                a=a+1
                ____continue = true
            until true if not ____continue then break end
        until not (a<10)`;

        util.expectCodeEqual(util.transpileString(input), expected);
    }
}
