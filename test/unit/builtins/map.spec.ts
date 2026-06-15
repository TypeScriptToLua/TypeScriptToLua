import * as util from "../../util";

test("map constructor", () => {
    util.testFunction`
        let mymap = new Map();
        return mymap.size;
    `.expectToMatchJsResult();
});

test("map iterable constructor", () => {
    util.testFunction`
        let mymap = new Map([["a", "c"],["b", "d"]]);
         return mymap.has("a") && mymap.has("b");
    `.expectToMatchJsResult();
});

test("map iterable constructor map", () => {
    util.testFunction`
        let mymap = new Map(new Map([["a", "c"],["b", "d"]]));
        return mymap.has("a") && mymap.has("b");
    `.expectToMatchJsResult();
});

test("map clear", () => {
    const mapTS = 'let mymap = new Map([["a", "c"],["b", "d"]]); mymap.clear();';
    util.testExpression("mymap.size").setTsHeader(mapTS).expectToMatchJsResult();

    util.testExpression('!mymap.has("a") && !mymap.has("b")').setTsHeader(mapTS).expectToMatchJsResult();
});

test("map delete", () => {
    util.testFunction`
        let mymap = new Map([["a", "c"],["b", "d"]]);
        mymap.delete("a");
        return mymap.has("b") && !mymap.has("a");
    `.expectToMatchJsResult();
});

test("map entries", () => {
    util.testFunction`
        let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
        let count = 0;
        for (const [key, value] of mymap.entries()) { count += key + value; }
        return count;
    `.expectToMatchJsResult();
});

test("map foreach", () => {
    util.testFunction(
        `let mymap = new Map([["a", 2],["b", 3],["c", 4]]);
        let count = 0;
        mymap.forEach(i => count += i);
        return count;`
    ).expectToMatchJsResult();
});

test("map foreach keys", () => {
    util.testFunction`
        let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
        let count = 0;
        mymap.forEach((value, key) => { count += key; });
        return count;
    `.expectToMatchJsResult();
});

test("map get", () => {
    util.testFunction`
        let mymap = new Map([["a", "c"],["b", "d"]]);
        return mymap.get("a");
    `.expectToMatchJsResult();
});

test("map get missing", () => {
    util.testFunction`
        let mymap = new Map([["a", "c"],["b", "d"]]);
        return mymap.get("c");
    `.expectToMatchJsResult();
});

test("map has", () => {
    util.testFunction`
        let mymap = new Map([["a", "c"]]);
        return mymap.has("a");
    `.expectToMatchJsResult();
});

test("map has false", () => {
    util.testFunction`
        let mymap = new Map();
        return mymap.has("a");
    `.expectToMatchJsResult();
});

test.each([
    '[["a", null]]',
    '[["b", "c"], ["a", null]]',
    '[["a", null], ["b", "c"]]',
    '[["b", "c"], ["a", null], ["x", "y"]]',
])("map (%p) has null", entries => {
    util.testFunction`
        let mymap = new Map(${entries});
        return mymap.has("a");
    `.expectToMatchJsResult();
});

test.each([
    '[["a", undefined]]',
    '[["b", "c"], ["a", undefined]]',
    '[["a", undefined], ["b", "c"]]',
    '[["b", "c"], ["a", undefined], ["x", "y"]]',
])("map (%p) has undefined", entries => {
    util.testFunction`
        let mymap = new Map(${entries});
        return mymap.has("a");
    `.expectToMatchJsResult();
});

test("map keys", () => {
    util.testFunction`
        let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
        let count = 0;
        for (const key of mymap.keys()) { count += key; }
        return count;
    `.expectToMatchJsResult();
});

test("map set", () => {
    const mapTS = 'let mymap = new Map(); mymap.set("a", 5);';
    util.testFunction(mapTS + 'return mymap.has("a");').expectToMatchJsResult();

    util.testFunction(mapTS + 'return mymap.get("a")').expectToMatchJsResult();
});

test("map values", () => {
    util.testFunction`
        let mymap = new Map([[5, 2],[6, 3],[7, 4]]);
        let count = 0;
        for (const value of mymap.values()) { count += value; }
        return count;
    `.expectToMatchJsResult();
});

test("map size", () => {
    util.testFunction("let m = new Map(); return m.size;").expectToMatchJsResult();
    util.testFunction("let m = new Map(); m.set(1,3); return m.size;").expectToMatchJsResult();
    util.testFunction("let m = new Map([[1,2],[3,4]]); return m.size;").expectToMatchJsResult();
    util.testFunction("let m = new Map([[1,2],[3,4]]); m.clear(); return m.size;").expectToMatchJsResult();
    util.testFunction("let m = new Map([[1,2],[3,4]]); m.delete(3); return m.size;").expectToMatchJsResult();
});

const iterationMethods = ["entries", "keys", "values"];
describe.each(iterationMethods)("map.%s() preserves insertion order", iterationMethod => {
    test("basic", () => {
        util.testFunction`
            const mymap = new Map();

            mymap.set("x", 1);
            mymap.set("a", 2);
            mymap.set(4, 3);
            mymap.set("b", 6);
            mymap.set(1, 4);
            mymap.set("a", 5);

            mymap.delete("b");

            return [...mymap.${iterationMethod}()];
        `.expectToMatchJsResult();
    });

    test("after removing last", () => {
        util.testFunction`
            const mymap = new Map();

            mymap.set("x", 1);
            mymap.set("a", 2);
            mymap.set(4, 3);

            mymap.delete(4);

            return [...mymap.${iterationMethod}()];
        `.expectToMatchJsResult();
    });

    test("after removing first", () => {
        util.testFunction`
            const mymap = new Map();

            mymap.set("x", 1);
            mymap.set("a", 2);
            mymap.set(4, 3);

            mymap.delete("x");

            return [...mymap.${iterationMethod}()];
        `.expectToMatchJsResult();
    });

    test("after removing all", () => {
        util.testFunction`
            const mymap = new Map();

            mymap.set("x", 1);
            mymap.set("a", 2);

            mymap.delete("a");
            mymap.delete("x");

            return [...mymap.${iterationMethod}()];
        `.expectToMatchJsResult();
    });
});

describe.each(iterationMethods)("map.%s() handles mutation", iterationMethod => {
    test("iterator persists after delete", () => {
        util.testFunction`
            const map = new Map<number, string>([[1, "a"], [2, "b"]]);
            const iter = map.${iterationMethod}();
            map.delete(1);
            return iter.next().value;
        `.expectToMatchJsResult();
    });

    test("iterator with delete and add between iterations", () => {
        util.testFunction`
            const map = new Map<number, string>([[1, "a"], [2, "b"], [3, "c"]]);
            const iter = map.${iterationMethod}();
            iter.next(); // 1
            map.delete(2);
            map.set(4, "d");
            const results: IteratorResult<any>[] = [];
            let r = iter.next();
            while (!r.done) { results.push({ done: r.done, value: r.value }); r = iter.next(); }
            return results;
        `.expectToMatchJsResult();
    });

    test("iterator does not restart after exhaustion", () => {
        util.testFunction`
            const map = new Map<number, string>([[1, "a"], [2, "b"]]);
            const iter = map.${iterationMethod}();
            const results: boolean[] = [];
            results.push(iter.next().done!);
            results.push(iter.next().done!);
            results.push(iter.next().done!); // should be done
            results.push(iter.next().done!); // should still be done, not restart
            return results;
        `.expectToMatchJsResult();
    });

    test("for-of delete current entry continues to next", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                map.delete(key);
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("for-of delete current entry with only two entries", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                map.delete(key);
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("for-of delete other entry during iteration", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                if (key === "a") { map.delete("b"); }
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("forEach delete current entry continues to next", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            map.forEach((_, key) => {
                visited.push(key);
                map.delete(key);
            });
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("forEach delete current and next entry", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            map.forEach((_, key) => {
                visited.push(key);
                if (key === "a") { map.delete("a"); map.delete("b"); }
            });
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("forEach delete current then re-add", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            map.forEach((_, key) => {
                visited.push(key);
                if (key === "a") { map.delete("a"); map.delete("b"); map.set("b", 9); }
            });
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("for-of delete current then add new entry", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                map.delete(key);
                if (key === "a") { map.set("c", 3); }
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("for-of delete then re-add same key", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                if (key === "a") { map.delete("b"); map.set("b", 9); }
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("for-of delete current and next entry", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                if (key === "a") { map.delete("a"); map.delete("b"); }
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("for-of delete current and all remaining entries", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3], ["d", 4]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                if (key === "a") { map.delete("a"); map.delete("b"); map.delete("c"); }
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });

    test("for-of delete current and next then re-add next", () => {
        util.testFunction`
            const map = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
            const visited: string[] = [];
            for (const [key] of map) {
                visited.push(key);
                if (key === "a") { map.delete("a"); map.delete("b"); map.set("b", 9); }
            }
            return { visited, size: map.size };
        `.expectToMatchJsResult();
    });
});

// Adapted from V8's collection-iterator.js (TestSetIteratorMutations2/3)
// https://chromium.googlesource.com/v8/v8/+/main/test/mjsunit/es6/collection-iterator.js
describe("map iterator stress (v8-style)", () => {
    test("iterator survives mass add+delete between next() calls", () => {
        util.testFunction`
            const m = new Map<number, number>();
            m.set(1, 11);
            m.set(2, 22);
            const iter = m.entries();
            const r1 = iter.next();
            m.delete(2);
            m.delete(1);
            for (let x = 2; x < 500; ++x) m.set(x, x * 10);
            for (let x = 2; x < 500; ++x) m.delete(x);
            for (let x = 2; x < 1000; ++x) m.set(x, x * 10);
            const r2 = iter.next();
            for (let x = 1001; x < 2000; ++x) m.set(x, x * 10);
            m.delete(3);
            for (let x = 6; x < 2000; ++x) m.delete(x);
            const r3 = iter.next();
            m.delete(5);
            const r4 = iter.next();
            return [r1.value, r2.value, r3.value, r4.done];
        `.expectToMatchJsResult();
    });

    test("delete all then re-add, iterator finds re-added", () => {
        util.testFunction`
            const m = new Map<number, number>();
            m.set(1, 11);
            m.set(2, 22);
            const iter = m.entries();
            const r1 = iter.next();
            m.delete(2);
            m.delete(1);
            m.set(2, 99);
            const r2 = iter.next();
            const r3 = iter.next();
            return [r1.value, r2.value, r3.done];
        `.expectToMatchJsResult();
    });

    test("mass delete during for-of", () => {
        util.testFunction`
            const m = new Map<number, number>();
            for (let i = 0; i < 100; i++) m.set(i, i);
            const visited: number[] = [];
            for (const [k] of m) {
                visited.push(k);
                m.delete(k);
            }
            return { count: visited.length, size: m.size, first: visited[0], last: visited[visited.length - 1] };
        `.expectToMatchJsResult();
    });

    test("mass delete every other during for-of", () => {
        util.testFunction`
            const m = new Map<number, number>();
            for (let i = 0; i < 100; i++) m.set(i, i);
            const visited: number[] = [];
            for (const [k] of m) {
                visited.push(k);
                m.delete(k);
                m.delete(k + 1);
            }
            return { count: visited.length, size: m.size };
        `.expectToMatchJsResult();
    });
});

// Lua tables don't shrink when entries are set to nil — they only resize on
// the next insert that exhausts all free hash nodes (luaH_newkey → getfreepos
// → rehash). Keys 1..10000 go to the array part (positive integers, >50%
// density). After deleting all, the array part stays allocated. Inserting -1
// (negative → hash part, which is empty/dummy after only positive keys)
// triggers rehash via the isdummy(t) check in luaH_newkey, causing
// computesizes to recalculate: 0 live integer keys → array shrinks to 0.
// Compaction during deletion already replaces orderedKeys/orderedValues
// with fresh arrays; the insert triggers rehash on the remaining keyIndex.
// See: https://github.com/lua/lua/blob/master/ltable.c (luaH_newkey, rehash, computesizes)
describe("map memory", () => {
    test("deleting keys should not leak memory", () => {
        const result = util.testFunction`
            /** @noSelf */ declare function collectgarbage(opt?: string): number;
            collectgarbage("collect");
            const baseline = collectgarbage("count");

            const map = new Map<number, number>();
            for (let i = 1; i <= 10000; i++) map.set(i, i);
            for (let i = 1; i <= 10000; i++) map.delete(i);
            // Trigger Lua table rehash to shrink internal tables (see comment above)
            map.set(-1, -1);
            map.delete(-1);

            collectgarbage("collect");
            const after = collectgarbage("count");

            return {
                size: map.size,
                retained: Math.floor(after - baseline),
            };
        `.getLuaExecutionResult();
        expect(result.size).toBe(0);
        expect(result.retained).toBe(0);
    });
});

describe("Map.groupBy", () => {
    test("empty", () => {
        util.testFunction`
            const array: number[] = [];

            const map = Map.groupBy(array, (num, index) => {
                return num % 2 === 0 ? "even": "odd";
            });

            return Object.fromEntries(map.entries());
        `.expectToEqual([]);
    });

    test("groupBy", () => {
        util.testFunction`
            const array = [0, 1, 2, 3, 4, 5];

            const map = Map.groupBy(array, (num, index) => {
                return num % 2 === 0 ? "even": "odd";
            });

            return Object.fromEntries(map.entries());
        `.expectToEqual({
            even: [0, 2, 4],
            odd: [1, 3, 5],
        });
    });

    test("groupBy index", () => {
        util.testFunction`
            const array = [0, 1, 2, 3, 4, 5];

            const map = Map.groupBy(array, (num, index) => {
                return index < 3 ? "low": "high";
            });

            return Object.fromEntries(map.entries());
        `.expectToEqual({
            low: [0, 1, 2],
            high: [3, 4, 5],
        });
    });
});
