import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util";

export class SetTests {
    @Test("set constructor")
    public setConstructor(): void
    {
        const result = util.transpileAndExecute(`let myset = new Set(); return myset.size;`);

        Expect(result).toBe(0);
    }

    @Test("set iterable constructor")
    public setIterableConstructor(): void
    {
        const result = util.transpileAndExecute(
            `let myset = new Set(["a", "b"]);
             return myset.has("a") || myset.has("b");`);

        Expect(result).toBe(true);
    }

    @Test("set iterable constructor set")
    public setIterableConstructorSet(): void
    {
        const result = util.transpileAndExecute(
            `let myset = new Set(new Set(["a", "b"]));
            return myset.has("a") || myset.has("b");`);

        Expect(result).toBe(true);
    }

    @Test("set add")
    public setAdd(): void
    {
        const has = util.transpileAndExecute(`let myset = new Set(); myset.add("a"); return myset.has("a");`);
        Expect(has).toBe(true);
    }

    @Test("set clear")
    public setClear(): void
    {
        const setTS = `let myset = new Set(["a", "b"]); myset.clear();`;
        const size = util.transpileAndExecute(setTS + `return myset.size;`);
        Expect(size).toBe(0);

        const contains = util.transpileAndExecute(setTS + `return !myset.has("a") && !myset.has("b");`);
        Expect(contains).toBe(true);
    }

    @Test("set delete")
    public setDelete(): void
    {
        const setTS = `let myset = new Set(["a", "b"]); myset.delete("a");`;
        const contains = util.transpileAndExecute(setTS + `return myset.has("b") && !myset.has("a");`);
        Expect(contains).toBe(true);
    }

    @Test("set entries")
    public setEntries(): void
    {
        const result = util.transpileAndExecute(
            `let myset = new Set([5, 6, 7]);
            let count = 0;
            for (var [key, value] of myset.entries()) { count += key + value; }
            return count;`
        );

        Expect(result).toBe(36);
    }

    @Test("set foreach")
    public setForEach(): void
    {
        const result = util.transpileAndExecute(
            `let myset = new Set([2, 3, 4]);
            let count = 0;
            myset.forEach(i => { count += i; });
            return count;`
        );
        Expect(result).toBe(9);
    }

    @Test("set foreach keys")
    public setForEachKeys(): void
    {
        const result = util.transpileAndExecute(
            `let myset = new Set([2, 3, 4]);
            let count = 0;
            myset.forEach((value, key) => { count += key; });
            return count;`
        );

        Expect(result).toBe(9);
    }

    @Test("set has")
    public setHas(): void
    {
        const contains = util.transpileAndExecute(`let myset = new Set(["a", "c"]); return myset.has("a");`);
        Expect(contains).toBe(true);
    }

    @Test("set has false")
    public setHasFalse(): void
    {
        const contains = util.transpileAndExecute(`let myset = new Set(); return myset.has("a");`);
        Expect(contains).toBe(false);
    }

    @Test("set has null")
    public setHasNull(): void
    {
        const contains = util.transpileAndExecute(`let myset = new Set(["a", "c"]); return myset.has(null);`);
        Expect(contains).toBe(false);
    }

    @Test("set keys")
    public setKeys(): void
    {
        const result = util.transpileAndExecute(
            `let myset = new Set([5, 6, 7]);
            let count = 0;
            for (var key of myset.keys()) { count += key; }
            return count;`
        );

        Expect(result).toBe(18);
    }

    @Test("set values")
    public setValues(): void
    {
        const result = util.transpileAndExecute(
            `let myset = new Set([5, 6, 7]);
            let count = 0;
            for (var value of myset.values()) { count += value; }
            return count;`
        );

        Expect(result).toBe(18);
    }

    @Test("set size")
    public setSize(): void {
        Expect(util.transpileAndExecute(`let m = new Set(); return m.size;`)).toBe(0);
        Expect(util.transpileAndExecute(`let m = new Set(); m.add(1); return m.size;`)).toBe(1);
        Expect(util.transpileAndExecute(`let m = new Set([1, 2]); return m.size;`)).toBe(2);
        Expect(util.transpileAndExecute(`let m = new Set([1, 2]); m.clear(); return m.size;`)).toBe(0);
        Expect(util.transpileAndExecute(`let m = new Set([1, 2]); m.delete(2); return m.size;`)).toBe(1);
    }
}
