import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class ArrayTests {
    @Test("Array access")
    public arrayAccess(): void {
        const lua = util.transpileString(
            `const arr: number[] = [3,5,1];
            return arr[1];`
        );
        const result = util.executeLua(lua);
        Expect(result).toBe(5);
    }

    @Test("Array union access")
    public arrayUnionAccess(): void {
        const lua = util.transpileString(
            `function makeArray(): number[] | string[] { return [3,5,1]; }
            const arr = makeArray();
            return arr[1];`
        );
        const result = util.executeLua(lua);
        Expect(result).toBe(5);
    }

    @Test("Array intersection access")
    public arrayIntersectionAccess(): void {
        const lua = util.transpileString(
            `type I = number[] & {foo: string};
            function makeArray(): I {
                let t = [3,5,1];
                (t as I).foo = "bar";
                return (t as I);
            }
            const arr = makeArray();
            return arr[1];`
        );
        const result = util.executeLua(lua);
        Expect(result).toBe(5);
    }

    @TestCase("firstElement()", 3)
    @TestCase("name", "array")
    @TestCase("length", 1)
    @Test("Derived array access")
    public derivedArrayAccess(member: string, expected: any): void {
        const lua = `local arr = {name="array", firstElement=function(self) return self[1]; end};`
        +  util.transpileString(
            `interface CustomArray<T> extends Array<T>{
                name:string,
                firstElement():number;
            };
            declare const arr: CustomArray<number>;
            arr[0] = 3;
            return arr.${member};`
        );
        const result = util.executeLua(lua);
        Expect(result).toBe(expected);
    }
}
