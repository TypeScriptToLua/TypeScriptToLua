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
            a=a+1
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
            a=a+1
        until not (a<10)`;

        util.expectCodeEqual(util.transpileString(input), expected);
    }
}
