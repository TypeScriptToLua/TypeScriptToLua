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

describe("Map.groupBy", () => {
    test("empty", () => {
        util.testFunction`
            const array = [];

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
