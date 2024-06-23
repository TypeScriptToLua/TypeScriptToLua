import * as util from "../../util";

test("set constructor", () => {
    util.testFunction`
        let myset = new Set();
        return myset.size;
    `.expectToMatchJsResult();
});

test("set iterable constructor", () => {
    util.testFunction`
        let myset = new Set(["a", "b"]);
        return myset.has("a") || myset.has("b");
    `.expectToMatchJsResult();
});

test("set iterable constructor set", () => {
    util.testFunction`
        let myset = new Set(new Set(["a", "b"]));
        return myset.has("a") || myset.has("b");
    `.expectToMatchJsResult();
});

test("set add", () => {
    util.testFunction`
        let myset = new Set();
        myset.add("a");
        return myset.has("a");
    `.expectToMatchJsResult();
});

test("set clear", () => {
    util.testFunction`
        let myset = new Set(["a", "b"]);
        myset.clear();
        return { size: myset.size, has: !myset.has("a") && !myset.has("b") };
    `.expectToMatchJsResult();
});

test("set delete", () => {
    util.testFunction`
        let myset = new Set(["a", "b"]);
        myset.delete("a");
        return myset.has("b") && !myset.has("a");
    `.expectToMatchJsResult();
});

test("set entries", () => {
    util.testFunction`
        let myset = new Set([5, 6, 7]);
        let count = 0;
        for (const [key, value] of myset.entries()) { count += key + value; }
        return count;
    `.expectToMatchJsResult();
});

test("set foreach", () => {
    util.testFunction`
        let myset = new Set([2, 3, 4]);
        let count = 0;
        myset.forEach(i => { count += i; });
        return count;
    `.expectToMatchJsResult();
});

test("set foreach keys", () => {
    util.testFunction`
        let myset = new Set([2, 3, 4]);
        let count = 0;
        myset.forEach((value, key) => { count += key; });
        return count;
    `.expectToMatchJsResult();
});

test("set has", () => {
    util.testFunction`
        let myset = new Set(["a", "c"]);
        return myset.has("a");
    `.expectToMatchJsResult();
});

test("set has after deleting keys", () => {
    util.testFunction`
        let myset = new Set(["a", "c"]);
        const results = [myset.has("c")];
        myset.delete("c");
        results.push(myset.has("c"));
        myset.delete("a");
        results.push(myset.has("a"))
        return results;
    `.expectToMatchJsResult();
});

test("set has false", () => {
    util.testFunction`
        let myset = new Set();
        return myset.has("a");
    `.expectToMatchJsResult();
});

test("set has null", () => {
    util.testFunction`
        let myset = new Set(["a", "c"]);
        return myset.has(null);
    `.expectToMatchJsResult();
});

test("set keys", () => {
    util.testFunction`
        let myset = new Set([5, 6, 7]);
        let count = 0;
        for (const key of myset.keys()) { count += key; }
        return count;
    `.expectToMatchJsResult();
});

test("set values", () => {
    util.testFunction`
        let myset = new Set([5, 6, 7]);
        let count = 0;
        for (const value of myset.values()) { count += value; }
        return count;
    `.expectToMatchJsResult();
});

test.each([
    "let m = new Set()",
    "let m = new Set(); m.add(1)",
    "let m = new Set([1, 2])",
    "let m = new Set([1, 2]); m.clear()",
    "let m = new Set([1, 2]); m.delete(2)",
])("set size (%p)", code => {
    util.testFunction`${code}; return m.size`.expectToMatchJsResult();
});

const iterationMethods = ["entries", "keys", "values"];
describe.each(iterationMethods)("set.%s() preserves insertion order", iterationMethod => {
    test("basic", () => {
        util.testFunction`
            const myset = new Set();

            myset.add("x");
            myset.add("a");
            myset.add(4);
            myset.add("b");
            myset.add(1);
            myset.add("a");

            myset.delete("b");

            return [...myset.${iterationMethod}()];
        `.expectToMatchJsResult();
    });

    test("after removing last", () => {
        util.testFunction`
            const myset = new Set();

            myset.add("x");
            myset.add("a");
            myset.add(4);

            myset.delete(4);

            return [...myset.${iterationMethod}()];
        `.expectToMatchJsResult();
    });

    test("after removing first", () => {
        util.testFunction`
            const myset = new Set();

            myset.add("x");
            myset.add("a");
            myset.add(4);

            myset.delete("x");

            return [...myset.${iterationMethod}()];
        `.expectToMatchJsResult();
    });

    test("after removing all", () => {
        util.testFunction`
            const myset = new Set();

            myset.add("x");
            myset.add("a");

            myset.delete("a");
            myset.delete("x");

            return [...myset.${iterationMethod}()];
        `.expectToMatchJsResult();
    });
});

test("instanceof Set without creating set", () => {
    util.testFunction`
        const myset = 3 as any;
        return myset instanceof Set;
    `.expectToMatchJsResult();
});

describe("new ECMAScript Set methods", () => {
    test("union", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6]);
            const set2 = new Set([4,5,6,7,8,9]);

            const intersection = set1.union(set2);
            return [...intersection];
        `.expectToEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    test("union with empty sets", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6]);
            const set2 = new Set([]);

            const intersection = set1.union(set2);
            return [...intersection];
        `.expectToEqual([1, 2, 3, 4, 5, 6]);

        util.testFunction`
            const set1 = new Set([]);
            const set2 = new Set([4,5,6,7,8,9]);

            const intersection = set1.union(set2);
            return [...intersection];
        `.expectToEqual([4, 5, 6, 7, 8, 9]);
    });

    test("intersection", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6]);
            const set2 = new Set([4,5,6,7,8,9]);

            const intersection = set1.intersection(set2);
            return [...intersection];
        `.expectToEqual([4, 5, 6]);
    });

    test("intersection with empty sets", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6]);
            const set2 = new Set([]);

            const intersection = set1.intersection(set2);
            return [...intersection];
        `.expectToEqual([]);

        util.testFunction`
            const set1 = new Set([]);
            const set2 = new Set([4,5,6,7,8,9]);

            const intersection = set1.intersection(set2);
            return [...intersection];
        `.expectToEqual([]);
    });

    test("difference", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6]);
            const set2 = new Set([4,5,6,7,8,9]);

            const intersection = set1.difference(set2);
            return [...intersection];
        `.expectToEqual([1, 2, 3]);
    });

    test("symmetricDifference", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6]);
            const set2 = new Set([4,5,6,7,8,9]);

            const intersection = set1.symmetricDifference(set2);
            return [...intersection];
        `.expectToEqual([1, 2, 3, 7, 8, 9]);
    });

    test("isSubsetOf", () => {
        util.testFunction`
            const set1 = new Set([3,4,5,6]);
            const set2 = new Set([1,2,3,4,5,6,7,8,9]);

            return {
                set1SubsetOfSet2: set1.isSubsetOf(set2),
                set2SubsetOfSet1: set2.isSubsetOf(set1),
            };
        `.expectToEqual({
            set1SubsetOfSet2: true,
            set2SubsetOfSet1: false,
        });
    });

    test("isSubsetOf equal", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6,7,8,9]);
            const set2 = new Set([1,2,3,4,5,6,7,8,9]);

            return {
                set1SubsetOfSet2: set1.isSubsetOf(set2),
                set2SubsetOfSet1: set2.isSubsetOf(set1),
            };
        `.expectToEqual({
            set1SubsetOfSet2: true,
            set2SubsetOfSet1: true,
        });
    });

    test("isSubsetOf empty", () => {
        util.testFunction`
            const set1 = new Set([]);
            const set2 = new Set([1,2,3]);

            return {
                set1SubsetOfSet2: set1.isSubsetOf(set2),
                set2SubsetOfSet1: set2.isSubsetOf(set1),
            };
        `.expectToEqual({
            set1SubsetOfSet2: true,
            set2SubsetOfSet1: false,
        });
    });

    test("isSupersetOf", () => {
        util.testFunction`
            const set1 = new Set([3,4,5,6]);
            const set2 = new Set([1,2,3,4,5,6,7,8,9]);

            return {
                set1SupersetOfSet2: set1.isSupersetOf(set2),
                set2SupersetOfSet1: set2.isSupersetOf(set1),
            };
        `.expectToEqual({
            set1SupersetOfSet2: false,
            set2SupersetOfSet1: true,
        });
    });

    test("isSupersetOf equal", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6,7,8,9]);
            const set2 = new Set([1,2,3,4,5,6,7,8,9]);

            return {
                set1SupersetOfSet2: set1.isSupersetOf(set2),
                set2SupersetOfSet1: set2.isSupersetOf(set1),
            };
        `.expectToEqual({
            set1SupersetOfSet2: true,
            set2SupersetOfSet1: true,
        });
    });

    test("isSupersetOf empty", () => {
        util.testFunction`
            const set1 = new Set([]);
            const set2 = new Set([1,2,3]);

            return {
                set1SupersetOfSet2: set1.isSupersetOf(set2),
                set2SupersetOfSet1: set2.isSupersetOf(set1),
            };
        `.expectToEqual({
            set1SupersetOfSet2: false,
            set2SupersetOfSet1: true,
        });
    });

    test("isDisjointFrom", () => {
        util.testFunction`
            const set1 = new Set([3,4,5,6]);
            const set2 = new Set([7,8,9]);
            const set3 = new Set([1,2,3,4]);

            return {
                set1DisjointFromSet2: set1.isDisjointFrom(set2),
                set2DisjointFromSet1: set2.isDisjointFrom(set1),
                set1DisjointFromSet3: set1.isDisjointFrom(set3),
                set3DisjointFromSet1: set3.isDisjointFrom(set1),
            };
        `.expectToEqual({
            set1DisjointFromSet2: true,
            set2DisjointFromSet1: true,
            set1DisjointFromSet3: false,
            set3DisjointFromSet1: false,
        });
    });

    test("isDisjointFrom equal", () => {
        util.testFunction`
            const set1 = new Set([1,2,3,4,5,6,7,8,9]);
            const set2 = new Set([1,2,3,4,5,6,7,8,9]);

            return {
                set1DisjointFromSet2: set1.isDisjointFrom(set2),
                set2DisjointFromSet1: set2.isDisjointFrom(set1),
            };
        `.expectToEqual({
            set1DisjointFromSet2: false,
            set2DisjointFromSet1: false,
        });
    });

    test("isDisjointFrom empty", () => {
        util.testFunction`
            const set1 = new Set([]);
            const set2 = new Set([1,2,3]);

            return {
                set1DisjointFromSet2: set1.isDisjointFrom(set2),
                set2DisjointFromSet1: set2.isDisjointFrom(set1),
            };
        `.expectToEqual({
            set1DisjointFromSet2: true,
            set2DisjointFromSet1: true,
        });
    });
});
