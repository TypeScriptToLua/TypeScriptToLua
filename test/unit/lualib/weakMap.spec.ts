import { Expect, Test } from "alsatian";
import * as util from "../../src/util";

export class WeakMapTests {
    private initRefsTs = `let ref = {};
                          let ref2 = () => {};`;

    @Test("weakMap constructor")
    public weakMapConstructor(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[ref, 1]]);
            return mymap.get(ref);
        `);

        Expect(result).toBe(1);
    }

    @Test("weakMap iterable constructor")
    public weakMapIterableConstructor(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[ref, 1], [ref2, 2]]);
            return mymap.has(ref) && mymap.has(ref2);
        `);

        Expect(result).toBe(true);
    }

    @Test("weakMap iterable constructor map")
    public weakMapIterableConstructor2(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap(new Map([[ref, 1], [ref2, 2]]));
            return mymap.has(ref) && mymap.has(ref2);
        `);

        Expect(result).toBe(true);
    }

    @Test("weakMap delete")
    public weakMapDelete(): void
    {
        const contains = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[ref, true], [ref2, true]]);
            mymap.delete(ref2);
            return mymap.has(ref) && !mymap.has(ref2);
        `);

        Expect(contains).toBe(true);
    }

    @Test("weakMap get")
    public weakMapGet(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[ref, 1], [{}, 2]]);
            return mymap.get(ref);
        `);

        Expect(result).toBe(1);
    }

    @Test("weakMap get missing")
    public weakMapGetMissing(): void
    {
        const result = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[{}, true]]);
            return mymap.get({});
        `);

        Expect(result).toBe(undefined);
    }

    @Test("weakMap has")
    public weakMapHas(): void
    {
        const contains = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[ref, true]]);
            return mymap.has(ref);
        `);

        Expect(contains).toBe(true);
    }

    @Test("weakMap has false")
    public weakMapHasFalse(): void
    {
        const contains = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[ref, true]]);
            return mymap.has(ref2);
        `);

        Expect(contains).toBe(false);
    }

    @Test("weakMap has null")
    public weakMapHasNull(): void
    {
        const contains = util.transpileAndExecute(this.initRefsTs + `
            let mymap = new WeakMap([[{}, true]]);
            return mymap.has(null);
        `);

        Expect(contains).toBe(false);
    }

    @Test("weakMap set")
    public weakMapSet(): void
    {
        const init = this.initRefsTs + `
            let mymap = new WeakMap();
            mymap.set(ref, 5);
        `;

        const has = util.transpileAndExecute(init + `return mymap.has(ref);`);
        Expect(has).toBe(true);

        const value = util.transpileAndExecute(init + `return mymap.get(ref)`);
        Expect(value).toBe(5);
    }

    @Test("weakMap has no map features")
    public weakMapHasNoMapFeatures(): void
    {
        const transpileAndExecute = (tsStr: string) => util.transpileAndExecute(tsStr, undefined, undefined, undefined, true);
        Expect(transpileAndExecute(`return new WeakMap().size`)).toBe(undefined);
        Expect(() => transpileAndExecute(`new WeakMap().clear()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakMap().keys()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakMap().values()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakMap().entries()`)).toThrow();
        Expect(() => transpileAndExecute(`new WeakMap().forEach(() => {})`)).toThrow();
    }
}
