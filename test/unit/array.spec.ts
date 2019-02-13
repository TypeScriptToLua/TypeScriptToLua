import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class ArrayTests {
    @Test("Array access")
    public arrayAccess(): void {
        const result = util.transpileAndExecute(
            `const arr: number[] = [3,5,1];
            return arr[1];`
        );
        Expect(result).toBe(5);
    }

    @Test("Array union access")
    public arrayUnionAccess(): void {
        const result = util.transpileAndExecute(
            `function makeArray(): number[] | string[] { return [3,5,1]; }
            const arr = makeArray();
            return arr[1];`
        );
        Expect(result).toBe(5);
    }

    @Test("Array union length")
    public arrayUnionLength(): void {
        const result = util.transpileAndExecute(
            `function makeArray(): number[] | string[] { return [3,5,1]; }
            const arr = makeArray();
            return arr.length;`
        );
        Expect(result).toBe(3);
    }

    @Test("Array intersection access")
    public arrayIntersectionAccess(): void {
        const result = util.transpileAndExecute(
            `type I = number[] & {foo: string};
            function makeArray(): I {
                let t = [3,5,1];
                (t as I).foo = "bar";
                return (t as I);
            }
            const arr = makeArray();
            return arr[1];`
        );
        Expect(result).toBe(5);
    }

    @Test("Array intersection length")
    public arrayIntersectionLength(): void {
        const result = util.transpileAndExecute(
            `type I = number[] & {foo: string};
            function makeArray(): I {
                let t = [3,5,1];
                (t as I).foo = "bar";
                return (t as I);
            }
            const arr = makeArray();
            return arr.length;`
        );
        Expect(result).toBe(3);
    }

    @TestCase("firstElement()", 3)
    @TestCase("name", "array")
    @TestCase("length", 1)
    @Test("Derived array access")
    public derivedArrayAccess(member: string, expected: any): void {
        const luaHeader = `local arr = {name="array", firstElement=function(self) return self[1]; end};`;
        const typeScriptHeader =
            `interface CustomArray<T> extends Array<T>{
                name:string,
                firstElement():number;
            };
            declare const arr: CustomArray<number>;`;

        const result = util.transpileAndExecute(
            `
            arr[0] = 3;
            return arr.${member};`,
            undefined,
            luaHeader,
            typeScriptHeader
        );

        Expect(result).toBe(expected);
    }

    @Test("Array delete")
    public arrayDelete(): void {
        const result = util.transpileAndExecute(
            `const myarray = [1,2,3,4];
            delete myarray[2];
            return \`\${myarray[0]},\${myarray[1]},\${myarray[2]},\${myarray[3]}\`;`
        );

        Expect(result).toBe("1,2,nil,4");
    }

    @Test("Array delete return true")
    public arrayDeleteReturnTrue(): void {
        const result = util.transpileAndExecute(
            `const myarray = [1,2,3,4];
            const exists = delete myarray[2];
            return \`\${exists}:\${myarray[0]},\${myarray[1]},\${myarray[2]},\${myarray[3]}\`;`
        );

        Expect(result).toBe("true:1,2,nil,4");
    }

    @Test("Array delete return false")
    public arrayDeleteReturnFalse(): void {
        const result = util.transpileAndExecute(
            `const myarray = [1,2,3,4];
            const exists = delete myarray[4];
            return \`\${exists}:\${myarray[0]},\${myarray[1]},\${myarray[2]},\${myarray[3]}\`;`
        );

        Expect(result).toBe("true:1,2,3,4");
    }

    @Test("Array property access")
    public arrayPropertyAccess(): void {
        const code =
            `type A = number[] & {foo?: string};
            const a: A = [1,2,3];
            a.foo = "bar";
            return \`\${a.foo}\${a[0]}\${a[1]}\${a[2]}\`;`;
        Expect(util.transpileAndExecute(code)).toBe("bar123");
    }
}
