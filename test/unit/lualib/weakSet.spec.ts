import { Expect, Test } from "alsatian";
import * as util from "../../src/util";

export class WeakSetTests {
    private initRefsTs = `let ref = {};
                          let ref2 = () => {};`;

    @Test("weakSet constructor")
    public weakSetConstructor(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let myset = new WeakSet([ref]);
            return myset.has(ref)
        `);

        Expect(result).toBe(true);
    }

    @Test("weakSet iterable constructor")
    public weakSetIterableConstructor(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let myset = new WeakSet([ref, ref2]);
            return myset.has(ref) && myset.has(ref2);
        `);

        Expect(result).toBe(true);
    }

    @Test("weakSet iterable constructor set")
    public weakSetIterableConstructorSet(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let myset = new WeakSet(new Set([ref, ref2]));
            return myset.has(ref) && myset.has(ref2);
        `);

        Expect(result).toBe(true);
    }

    @Test("weakSet add")
    public weakSetAdd(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let myset = new WeakSet();
            myset.add(ref);
            return myset.has(ref);
        `);

        Expect(result).toBe(true);
    }

    @Test("weakSet add different references")
    public weakSetAddDifferentReferences(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let myset = new WeakSet();
            myset.add({});
            return myset.has({});
        `);

        Expect(result).toBe(false);
    }

    @Test("weakSet delete")
    public weakSetDelete(): void
    {
        const contains = util.transpileAndExecute(this.initRefsTs + `
            let myset = new WeakSet([ref, ref2]);
            myset.delete(ref);
            return myset.has(ref2) && !myset.has(ref);
        `);
        Expect(contains).toBe(true);
    }

    @Test("weakSet has no set features")
    public weakSetHasNoSetFeatures(): void
    {
        const transpileAndExecute = (tsStr: string) => util.transpileAndExecute(tsStr, undefined, undefined, undefined, true);
        Expect(transpileAndExecute(`return new WeakSet().size`)).toBe(undefined);
        Expect(() => transpileAndExecute(`new WeakSet().clear()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakSet().keys()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakSet().values()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakSet().entries()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakSet().forEach(() => {})`)).toThrow();
    }
}
