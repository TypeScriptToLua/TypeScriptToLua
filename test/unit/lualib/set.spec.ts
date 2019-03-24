import * as util from "../../util";

test("set constructor", () => {
    const result = util.transpileAndExecute(`let myset = new Set(); return myset.size;`);

    expect(result).toBe(0);
});

test("set iterable constructor", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set(["a", "b"]);
         return myset.has("a") || myset.has("b");`,
    );

    expect(result).toBe(true);
});

test("set iterable constructor set", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set(new Set(["a", "b"]));
        return myset.has("a") || myset.has("b");`,
    );

    expect(result).toBe(true);
});

test("set add", () => {
    const has = util.transpileAndExecute(
        `let myset = new Set(); myset.add("a"); return myset.has("a");`,
    );
    expect(has).toBe(true);
});

test("set clear", () => {
    const setTS = `let myset = new Set(["a", "b"]); myset.clear();`;
    const size = util.transpileAndExecute(setTS + `return myset.size;`);
    expect(size).toBe(0);

    const contains = util.transpileAndExecute(setTS + `return !myset.has("a") && !myset.has("b");`);
    expect(contains).toBe(true);
});

test("set delete", () => {
    const setTS = `let myset = new Set(["a", "b"]); myset.delete("a");`;
    const contains = util.transpileAndExecute(setTS + `return myset.has("b") && !myset.has("a");`);
    expect(contains).toBe(true);
});

test("set entries", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set([5, 6, 7]);
        let count = 0;
        for (var [key, value] of myset.entries()) { count += key + value; }
        return count;`,
    );

    expect(result).toBe(36);
});

test("set foreach", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set([2, 3, 4]);
        let count = 0;
        myset.forEach(i => { count += i; });
        return count;`,
    );
    expect(result).toBe(9);
});

test("set foreach keys", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set([2, 3, 4]);
        let count = 0;
        myset.forEach((value, key) => { count += key; });
        return count;`,
    );

    expect(result).toBe(9);
});

test("set has", () => {
    const contains = util.transpileAndExecute(
        `let myset = new Set(["a", "c"]); return myset.has("a");`,
    );
    expect(contains).toBe(true);
});

test("set has false", () => {
    const contains = util.transpileAndExecute(`let myset = new Set(); return myset.has("a");`);
    expect(contains).toBe(false);
});

test("set has null", () => {
    const contains = util.transpileAndExecute(
        `let myset = new Set(["a", "c"]); return myset.has(null);`,
    );
    expect(contains).toBe(false);
});

test("set keys", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set([5, 6, 7]);
        let count = 0;
        for (var key of myset.keys()) { count += key; }
        return count;`,
    );

    expect(result).toBe(18);
});

test("set values", () => {
    const result = util.transpileAndExecute(
        `let myset = new Set([5, 6, 7]);
        let count = 0;
        for (var value of myset.values()) { count += value; }
        return count;`,
    );

    expect(result).toBe(18);
});

test.each([
    { code: `let m = new Set(); return m.size;`, expected: 0 },
    { code: `let m = new Set(); m.add(1); return m.size;`, expected: 1 },
    { code: `let m = new Set([1, 2]); return m.size;`, expected: 2 },
    { code: `let m = new Set([1, 2]); m.clear(); return m.size;`, expected: 0 },
    { code: `let m = new Set([1, 2]); m.delete(2); return m.size;`, expected: 1 },
])("set size", ({ code, expected }) => {
    expect(util.transpileAndExecute(code)).toBe(expected);
});
