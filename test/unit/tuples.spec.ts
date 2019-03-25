import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class TupleTests {
    @Test("Tuple loop")
    public tupleLoop(): void
    {
        const result = util.transpileAndExecute(
            `const tuple: [number, number, number] = [3,5,1];
            let count = 0;
            for (const value of tuple) { count += value; }
            return count;`
        );

        // Assert
        Expect(result).toBe(9);
    }

    @Test("Tuple foreach")
    public tupleForEach(): void
    {
        const result = util.transpileAndExecute(
            `const tuple: [number, number, number] = [3,5,1];
            let count = 0;
            tuple.forEach(v => count += v);
            return count;`
        );

        // Assert
        Expect(result).toBe(9);
    }

    @Test("Tuple access")
    public tupleAccess(): void
    {
        const result = util.transpileAndExecute(
            `const tuple: [number, number, number] = [3,5,1];
            return tuple[1];`
        );

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple union access")
    public tupleUnionAccess(): void
    {
        const result = util.transpileAndExecute(
            `function makeTuple(): [number, number, number] | [string, string, string] { return [3,5,1]; }
            const tuple = makeTuple();
            return tuple[1];`
        );
        Expect(result).toBe(5);
    }

    @Test("Tuple intersection access")
    public tupleIntersectionAccess(): void
    {
        const result = util.transpileAndExecute(
            `type I = [number, number, number] & {foo: string};
            function makeTuple(): I {
                let t = [3,5,1];
                (t as I).foo = "bar";
                return (t as I);
            }
            const tuple = makeTuple();
            return tuple[1];`
        );
        Expect(result).toBe(5);
    }

    @Test("Tuple Destruct")
    public tupleDestruct(): void
    {
        const result = util.transpileAndExecute(
            `function tuple(): [number, number, number] { return [3,5,1]; }
            const [a,b,c] = tuple();
            return b;`
        );

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple length")
    public tupleLength(): void
    {
        const result = util.transpileAndExecute(
            `const tuple: [number, number, number] = [3,5,1];
            return tuple.length;`
        );

        // Assert
        Expect(result).toBe(3);
    }

    @Test("Tuple Return Access")
    public tupleReturnAccess(): void
    {
        const result = util.transpileAndExecute(
            `/** @tupleReturn */
            function tuple(): [number, number, number] { return [3,5,1]; }
            return tuple()[2];`
        );

        // Assert
        Expect(result).toBe(1);
    }

    @Test("Tuple Return Destruct Declaration")
    public tupleReturnDestructDeclaration(): void
    {
        const result = util.transpileAndExecute(
            `/** @tupleReturn */
            function tuple(): [number, number, number] { return [3,5,1]; }
            const [a,b,c] = tuple();
            return b;`
        );

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple Return Destruct Assignment")
    public tupleReturnDestructAssignment(): void
    {
        const result = util.transpileAndExecute(
            `/** @tupleReturn */
            function tuple(): [number, number] { return [3,6]; }
            let [a,b] = [1,2];
            [b,a] = tuple();
            return a - b;`
        );

        // Assert
        Expect(result).toBe(3);
    }

    @Test("Tuple Static Method Return Destruct")
    public tupleStaticMethodReturnDestruct(): void
    {
        const result = util.transpileAndExecute(
            `class Test {
                /** @tupleReturn */
                static tuple(): [number, number, number] { return [3,5,1]; }
            }
            const [a,b,c] = Test.tuple();
            return b;`
        );

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple Non-Static Method Return Destruct")
    public tupleMethodNonStaticReturnDestruct(): void
    {
        const result = util.transpileAndExecute(
            `class Test {
                /** @tupleReturn */
                tuple(): [number, number, number] { return [3,5,1]; }
            }
            const t = new Test();
            const [a,b,c] = t.tuple();
            return b;`
        );

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple Return on Arrow Function")
    public tupleReturnOnArrowFunction(): void {
        const code =
            `const fn = /** @tupleReturn */ (s: string) => [s, "bar"];
            const [a, b] = fn("foo");
            return a + b;`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("foobar");
    }

    @Test("Tuple Return Inference")
    public tupleReturnInference(): void {
        const code =
            `/** @tupleReturn */ interface Fn { (s: string): [string, string] }
            const fn: Fn = s => [s, "bar"];
            const [a, b] = fn("foo");
            return a + b;`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("foobar");
    }

    @Test("Tuple Return Inference as Argument")
    public tupleReturnInferenceAsArgument(): void {
        const code =
            `/** @tupleReturn */ interface Fn { (s: string): [string, string] }
            function foo(fn: Fn) {
                const [a, b] = fn("foo");
                return a + b;
            }
            return foo(s => [s, "bar"]);`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("foobar");
    }

    @Test("Tuple Return Inference as Elipsis Argument")
    public tupleReturnInferenceAsElipsisArgument(): void {
        const code =
            `/** @tupleReturn */ interface Fn { (s: string): [string, string] }
            function foo(a: number, ...fn: Fn[]) {
                const [a, b] = fn[0]("foo");
                return a + b;
            }
            return foo(7, s => [s, "bar"]);`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("foobar");
    }

    @Test("Tuple Return Inference as Elipsis Tuple Argument")
    public tupleReturnInferenceAsElipsisTupleArgument(): void {
        const code =
            `/** @tupleReturn */ interface Fn { (s: string): [string, string] }
            function foo(a: number, ...fn: [number, Fn]) {
                const [a, b] = fn[1]("foo");
                return a + b;
            }
            return foo(7, 17, s => [s, "bar"]);`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("foobar");
    }

    @Test("Tuple Return in Spread")
    public tupleReturnInSpread(): void {
        const code =
            `/** @tupleReturn */ function foo(): [string, string] {
                return ["foo", "bar"];
            }
            function bar(a: string, b: string) {
                return a + b;
            }
            return bar(...foo());`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("foobar");
    }

    @Test("Tuple Return on Type Alias")
    public tupleReturnOnTypeAlias(): void {
        const code =
            `/** @tupleReturn */ type Fn = () => [number, number];
            const fn: Fn = () => [1, 2];
            const [a, b] = fn();
            return a + b;`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe(3);
    }

    @Test("Tuple Return on Interface")
    public tupleReturnOnInterface(): void {
        const code =
            `/** @tupleReturn */ interface Fn { (): [number, number]; }
            const fn: Fn = () => [1, 2];
            const [a, b] = fn();
            return a + b;`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe(3);
    }

    @Test("Tuple Return on Interface Signature")
    public tupleReturnOnInterfaceSignature(): void {
        const code =
            `interface Fn {
                /** @tupleReturn */ (): [number, number];
            }
            const fn: Fn = () => [1, 2];
            const [a, b] = fn();
            return a + b;`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe(3);
    }

    @Test("Tuple Return on Overload")
    public tupleReturnOnOverload(): void {
        const code =
            `function fn(a: number): number;
            /** @tupleReturn */ function fn(a: string, b: string): [string, string];
            function fn(a: number | string, b?: string): number | [string, string] {
                if (typeof a === "number") {
                    return a;
                } else {
                    return [a, b as string];
                }
            }
            const a = fn(3);
            const [b, c] = fn("foo", "bar");
            return a + b + c`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("3foobar");
    }

    @Test("Tuple Return on Interface Overload")
    public tupleReturnOnInterfaceOverload(): void {
        const code =
            `interface Fn {
                (a: number): number;
                /** @tupleReturn */ (a: string, b: string): [string, string];
            }
            const fn = ((a: number | string, b?: string): number | [string, string] => {
                if (typeof a === "number") {
                    return a;
                } else {
                    return [a, b as string];
                }
            }) as Fn;
            const a = fn(3);
            const [b, c] = fn("foo", "bar");
            return a + b + c`;
        const lua = util.transpileString(code);
        Expect(lua).not.toContain("unpack");
        const result = util.executeLua(lua);
        Expect(result).toBe("3foobar");
    }

    @Test("Tuple Return vs Non-Tuple Return Overload")
    public tupleReturnVsNonTupleReturnOverload(): void {
        const luaHeader =
            `function fn(a, b)
                if type(a) == "number" then
                    return {a, a + 1}
                else
                    return a, b
                end
            end`;
        const tsHeader =
            `declare function fn(this: void, a: number): [number, number];
            /** @tupleReturn */ declare function fn(this: void, a: string, b: string): [string, string];`;
        const code =
            `const [a, b] = fn(3);
            const [c, d] = fn("foo", "bar");
            return (a + b) + c + d;`;
        const result = util.transpileAndExecute(code, undefined, luaHeader, tsHeader);
        Expect(result).toBe("7foobar");
    }
}
