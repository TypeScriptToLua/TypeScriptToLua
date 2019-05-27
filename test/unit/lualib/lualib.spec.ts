import * as util from "../../util";

test.each([
    { condition: "true", lhs: "4", rhs: "5", expected: 4 },
    { condition: "false", lhs: "4", rhs: "5", expected: 5 },
    { condition: "3", lhs: "4", rhs: "5", expected: 4 },
])("Ternary Conditional (%p)", ({ condition, lhs, rhs, expected }) => {
    const result = util.transpileAndExecute(`return ${condition} ? ${lhs} : ${rhs};`);

    expect(result).toBe(expected);
});

test.each([
    { condition: "true", expected: 11 },
    { condition: "false", expected: 13 },
    { condition: "a < 4", expected: 13 },
    { condition: "a == 8", expected: 11 },
])("Ternary Conditional Delayed (%p)", ({ condition, expected }) => {
    const result = util.transpileAndExecute(
        `let a = 3;
         let delay = () => ${condition} ? a + 3 : a + 5;
         a = 8;
         return delay();`
    );

    expect(result).toBe(expected);
});

test.each([
    { initial: "{a: 3}", parameters: "{}", expected: { a: 3 } },
    { initial: "{}", parameters: "{a: 3}", expected: { a: 3 } },
    { initial: "{a: 3}", parameters: "{a: 5}", expected: { a: 5 } },
    { initial: "{a: 3}", parameters: "{b: 5},{c: 7}", expected: { a: 3, b: 5, c: 7 } },
])("Object.assign (%p)", ({ initial, parameters, expected }) => {
    const jsonResult = util.transpileAndExecute(`
        return JSONStringify(Object.assign(${initial},${parameters}));
    `);

    const result = JSON.parse(jsonResult);
    expect(result).toEqual(expected);
});

test.each([
    { obj: "{}", expected: [] },
    { obj: "{abc: 3}", expected: ["abc,3"] },
    { obj: "{abc: 3, def: 'xyz'}", expected: ["abc,3", "def,xyz"] },
])("Object.entries (%p)", ({ obj, expected }) => {
    const result = util.transpileAndExecute(`
        const obj = ${obj};
        return Object.entries(obj).map(e => e.join(",")).join(";");
    `) as string;

    const foundKeys = result.split(";");
    if (expected.length === 0) {
        expect(foundKeys.length).toBe(1);
        expect(foundKeys[0]).toBe("");
    } else {
        expect(foundKeys.length).toBe(expected.length);
        for (const key of expected) {
            expect(foundKeys.indexOf(key) >= 0).toBeTruthy();
        }
    }
});

test.each([
    { obj: "{}", expected: [] },
    { obj: "{abc: 3}", expected: ["abc"] },
    { obj: "{abc: 3, def: 'xyz'}", expected: ["abc", "def"] },
])("Object.keys (%p)", ({ obj, expected }) => {
    const result = util.transpileAndExecute(`
        const obj = ${obj};
        return Object.keys(obj).join(",");
    `) as string;

    const foundKeys = result.split(",");
    if (expected.length === 0) {
        expect(foundKeys.length).toBe(1);
        expect(foundKeys[0]).toBe("");
    } else {
        expect(foundKeys.length).toBe(expected.length);
        for (const key of expected) {
            expect(foundKeys.indexOf(key) >= 0).toBeTruthy();
        }
    }
});

test.each([
    { obj: "{}", expected: [] },
    { obj: "{abc: 'def'}", expected: ["def"] },
    { obj: "{abc: 3, def: 'xyz'}", expected: ["3", "xyz"] },
])("Object.values (%p)", ({ obj, expected }) => {
    const result = util.transpileAndExecute(`
        const obj = ${obj};
        return Object.values(obj).join(",");
    `) as string;

    const foundValues = result.split(",");
    if (expected.length === 0) {
        expect(foundValues.length).toBe(1);
        expect(foundValues[0]).toBe("");
    } else {
        expect(foundValues.length).toBe(expected.length);
        for (const key of expected) {
            expect(foundValues.indexOf(key) >= 0).toBeTruthy();
        }
    }
});

// https://github.com/Microsoft/TypeScript/pull/26149
const objectFromEntriesDeclaration = `
    interface ObjectConstructor {
        fromEntries<T>(entries: ReadonlyArray<[string, T]> | Iterable<[string, T]>): Record<string, T>;
        fromEntries(entries: ReadonlyArray<[string, any]> | Iterable<[string, any]>): Record<string, any>;
    }
`;

test.each([
    { entries: [], expected: [] },
    { entries: [["a", 1], ["b", 2]], expected: { a: 1, b: 2 } },
    { entries: [["a", 1], ["a", 2]], expected: { a: 2 } },
])("Object.fromEntries (%p)", ({ entries, expected }) => {
    const result = util.transpileAndExecute(
        `const obj = Object.fromEntries(${JSON.stringify(entries)});
        return JSONStringify(obj);`,
        undefined,
        undefined,
        objectFromEntriesDeclaration
    );

    expect(JSON.parse(result)).toEqual(expected);
});

test("Object.fromEntries (Map)", () => {
    const result = util.transpileAndExecute(
        `const map = new Map([["foo", "bar"]]);
        const obj = Object.fromEntries(map);
        return JSONStringify(obj);`,
        undefined,
        undefined,
        objectFromEntriesDeclaration
    );

    expect(JSON.parse(result)).toEqual({ foo: "bar" });
});
