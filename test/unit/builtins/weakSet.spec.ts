import * as util from "../../util";

const initRefsTs = `
    let ref = {};
    let ref2 = () => {};
`;

test("weakSet constructor", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let myset = new WeakSet([ref]);
        return myset.has(ref)
    `);

    expect(result).toBe(true);
});

test("weakSet iterable constructor", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let myset = new WeakSet([ref, ref2]);
        return myset.has(ref) && myset.has(ref2);
    `);

    expect(result).toBe(true);
});

test("weakSet iterable constructor set", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let myset = new WeakSet(new Set([ref, ref2]));
        return myset.has(ref) && myset.has(ref2);
    `);

    expect(result).toBe(true);
});

test("weakSet add", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let myset = new WeakSet();
        myset.add(ref);
        return myset.has(ref);
    `);

    expect(result).toBe(true);
});

test("weakSet add different references", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let myset = new WeakSet();
        myset.add({});
        return myset.has({});
    `);

    expect(result).toBe(false);
});

test("weakSet delete", () => {
    const contains = util.transpileAndExecute(`
        ${initRefsTs}
        let myset = new WeakSet([ref, ref2]);
        myset.delete(ref);
        return myset.has(ref2) && !myset.has(ref);
    `);
    expect(contains).toBe(true);
});

test("weakSet has no set features (size)", () => {
    expect(util.transpileAndExecute("return (new WeakSet() as any).size")).toBeUndefined();
});

test.each(["clear()", "keys()", "values()", "entries()", "forEach(() => {})"])(
    "weakSet has no set features (%p)",
    call => {
        expect(() => util.transpileAndExecute(`(new WeakSet() as any).${call}`)).toThrow();
    }
);
