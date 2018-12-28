import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util";

export class MapTests {
    @Test("map constructor")
    public mapConstructor(): void {
        const lua = util.transpileString(`let mymap = new Map(); return mymap.size;`);
        const result = util.executeLua(lua);

        Expect(result).toBe(0);
    }

    @Test("map iterable constructor")
    public mapIterableConstructor(): void {
        const lua = util.transpileString(`let mymap = new Map([["a", "c"],["b", "d"]]);
                                          return mymap.has("a") && mymap.has("b");`);
        const result = util.executeLua(lua);

        Expect(result).toBe(true);
    }

    @Test("map iterable constructor map")
    public mapIterableConstructor2(): void {
        const lua = util.transpileString(`let mymap = new Map(new Map([["a", "c"],["b", "d"]]));
                                          return mymap.has("a") && mymap.has("b");`);
        const result = util.executeLua(lua);

        Expect(result).toBe(true);
    }

    @Test("map clear")
    public mapClear(): void {
        const mapTS = `let mymap = new Map([["a", "c"],["b", "d"]]); mymap.clear();`;
        const lua = util.transpileString(mapTS + `return mymap.size;`);
        const size = util.executeLua(lua);
        Expect(size).toBe(0);

        const lua2 = util.transpileString(mapTS + `return !mymap.has("a") && !mymap.has("b");`);
        const contains = util.executeLua(lua2);
        Expect(contains).toBe(true);
    }

    @Test("map delete")
    public mapDelete(): void {
        const mapTS = `let mymap = new Map([["a", "c"],["b", "d"]]); mymap.delete("a");`;
        const lua = util.transpileString(mapTS + `return mymap.has("b") && !mymap.has("a");`);
        const contains = util.executeLua(lua);
        Expect(contains).toBe(true);
    }

    @Test("map entries")
    public mapEntries(): void {
        const lua = util.transpileString(`let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
                                          let count = 0;
                                          for (var [key, value] of mymap.entries()) { count += key + value; }
                                          return count;`);
        const result = util.executeLua(lua);
        Expect(result).toBe(27);
    }

    @Test("map foreach")
    public mapForEach(): void {
        const lua = util.transpileString(
            `let mymap = new Map([["a", 2],["b", 3],["c", 4]]);
            let count = 0;
            mymap.forEach(i => count += i);
            return count;`
        );

        const result = util.executeLua(lua);
        Expect(result).toBe(9);
    }

    @Test("map foreach keys")
    public mapForEachKeys(): void {
        const lua = util.transpileString(
            `let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
            let count = 0;
            mymap.forEach((value, key) => { count += key; });
            return count;`
        );

        const result = util.executeLua(lua);
        Expect(result).toBe(18);
    }

    @Test("map get")
    public mapGet(): void {
        const lua = util.transpileString(`let mymap = new Map([["a", "c"],["b", "d"]]); return mymap.get("a");`);
        const result = util.executeLua(lua);
        Expect(result).toBe("c");
    }

    @Test("map get missing")
    public mapGetMissing(): void {
        const lua = util.transpileString(`let mymap = new Map([["a", "c"],["b", "d"]]); return mymap.get("c");`);
        const result = util.executeLua(lua);
        Expect(result).toBe(undefined);
    }

    @Test("map has")
    public mapHas(): void {
        const lua = util.transpileString(`let mymap = new Map([["a", "c"]]); return mymap.has("a");`);
        const contains = util.executeLua(lua);
        Expect(contains).toBe(true);
    }

    @Test("map has false")
    public mapHasFalse(): void {
        const lua = util.transpileString(`let mymap = new Map(); return mymap.has("a");`);
        const contains = util.executeLua(lua);
        Expect(contains).toBe(false);
    }

    @Test("map has null")
    public mapHasNull(): void {
        const lua = util.transpileString(`let mymap = new Map([["a", "c"]]); return mymap.has(null);`);
        const contains = util.executeLua(lua);
        Expect(contains).toBe(false);
    }

    @Test("map keys")
    public mapKeys(): void {
        const lua = util.transpileString(`let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
                                          let count = 0;
                                          for (var key of mymap.keys()) { count += key; }
                                          return count;`);
        const result = util.executeLua(lua);
        Expect(result).toBe(18);
    }

    @Test("map set")
    public mapSet(): void {
        const mapTS = `let mymap = new Map(); mymap.set("a", 5);`;
        const lua = util.transpileString(mapTS + `return mymap.has("a");`);
        const has = util.executeLua(lua);
        Expect(has).toBe(true);

        const lua2 = util.transpileString(mapTS + `return mymap.get("a")`);
        const value = util.executeLua(lua2);
        Expect(value).toBe(5);
    }

    @Test("map values")
    public mapValues(): void {
        const lua = util.transpileString(`let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
                                          let count = 0;
                                          for (var value of mymap.values()) { count += value; }
                                          return count;`);
        const result = util.executeLua(lua);
        Expect(result).toBe(9);
    }

    @Test("map size")
    public mapSize(): void {
        Expect(util.transpileAndExecute(`let m = new Map(); return m.size;`)).toBe(0);
        Expect(util.transpileAndExecute(`let m = new Map(); m.set(1,3); return m.size;`)).toBe(1);
        Expect(util.transpileAndExecute(`let m = new Map([[1,2],[3,4]]); return m.size;`)).toBe(2);
        Expect(util.transpileAndExecute(`let m = new Map([[1,2],[3,4]]); m.clear(); return m.size;`)).toBe(0);
        Expect(util.transpileAndExecute(`let m = new Map([[1,2],[3,4]]); m.delete(3); return m.size;`)).toBe(1);
    }
}
