import * as util from "../../util";

const initRefsTs = `
    let ref = {};
    let ref2 = () => {};
`;

test("weakMap constructor", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, 1]]);
        return mymap.get(ref);
    `);

    expect(result).toBe(1);
});

test("weakMap iterable constructor", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, 1], [ref2, 2]]);
        return mymap.has(ref) && mymap.has(ref2);
    `);

    expect(result).toBe(true);
});

test("weakMap iterable constructor map", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap(new Map([[ref, 1], [ref2, 2]]));
        return mymap.has(ref) && mymap.has(ref2);
    `);

    expect(result).toBe(true);
});

test("weakMap delete", () => {
    const contains = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, true], [ref2, true]]);
        mymap.delete(ref2);
        return mymap.has(ref) && !mymap.has(ref2);
    `);

    expect(contains).toBe(true);
});

test("weakMap get", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, 1], [{}, 2]]);
        return mymap.get(ref);
    `);

    expect(result).toBe(1);
});

test("weakMap get missing", () => {
    const result = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[{}, true]]);
        return mymap.get({});
    `);

    expect(result).toBe(undefined);
});

test("weakMap has", () => {
    const contains = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, true]]);
        return mymap.has(ref);
    `);

    expect(contains).toBe(true);
});

test("weakMap has false", () => {
    const contains = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, true]]);
        return mymap.has(ref2);
    `);

    expect(contains).toBe(false);
});

test("weakMap has null", () => {
    const contains = util.transpileAndExecute(`
        ${initRefsTs}
        let mymap = new WeakMap([[{}, true]]);
        return mymap.has(null);
    `);

    expect(contains).toBe(false);
});

test("weakMap set", () => {
    const init = `
        ${initRefsTs}
        let mymap = new WeakMap();
        mymap.set(ref, 5);
    `;

    const has = util.transpileAndExecute(init + `return mymap.has(ref);`);
    expect(has).toBe(true);

    const value = util.transpileAndExecute(init + `return mymap.get(ref)`);
    expect(value).toBe(5);
});

test("weakMap has no map features", () => {
    const transpileAndExecute = (tsStr: string) =>
        util.transpileAndExecute(tsStr, undefined, undefined, undefined, true);
    expect(transpileAndExecute(`return new WeakMap().size`)).toBe(undefined);
    expect(() => transpileAndExecute(`new WeakMap().clear()`)).toThrow();
    expect(() => transpileAndExecute(`new WeakMap().keys()`)).toThrow();
    expect(() => transpileAndExecute(`new WeakMap().values()`)).toThrow();
    expect(() => transpileAndExecute(`new WeakMap().entries()`)).toThrow();
    expect(() => transpileAndExecute(`new WeakMap().forEach(() => {})`)).toThrow();
});
