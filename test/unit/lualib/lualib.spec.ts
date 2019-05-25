import * as util from "../../util";

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("forEach (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
        arrTest.forEach((elem, index) => {
            arrTest[index] = arrTest[index] + 1;
        })
        return JSONStringify(arrTest);`,
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([
    { inp: [], searchEl: 3, expected: -1 },
    { inp: [0, 2, 4, 8], searchEl: 10, expected: -1 },
    { inp: [0, 2, 4, 8], searchEl: 8, expected: 3 },
])("array.findIndex[value] (%p)", ({ inp, searchEl, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
        return JSONStringify(arrTest.findIndex((elem, index) => {
            return elem === ${searchEl};
        }));`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: [0, 2, 4, 8], expected: 3, value: 8 },
    { inp: [0, 2, 4, 8], expected: 1, value: 2 },
])("array.findIndex[index] (%p)", ({ inp, expected, value }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
        return JSONStringify(arrTest.findIndex((elem, index, arr) => {
            return index === ${expected} && arr[${expected}] === ${value};
        }));`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: [], func: "x => x" },
    { inp: [0, 1, 2, 3], func: "x => x" },
    { inp: [0, 1, 2, 3], func: "x => x*2" },
    { inp: [1, 2, 3, 4], func: "x => -x" },
    { inp: [0, 1, 2, 3], func: "x => x+2" },
    { inp: [0, 1, 2, 3], func: "x => x%2 == 0 ? x + 1 : x - 1" },
])("array.map (%p)", ({ inp, func }) => {
    const result = util.transpileAndExecute(
        `return JSONStringify([${inp.toString()}].map(${func}))`,
    );

    expect(result).toBe(JSON.stringify(inp.map(eval(func))));
});

test.each([
    { inp: [], func: "x => x > 1" },
    { inp: [0, 1, 2, 3], func: "x => x > 1" },
    { inp: [0, 1, 2, 3], func: "x => x < 3" },
    { inp: [0, 1, 2, 3], func: "x => x < 0" },
    { inp: [0, -1, -2, -3], func: "x => x < 0" },
    { inp: [0, 1, 2, 3], func: "() => true" },
    { inp: [0, 1, 2, 3], func: "() => false" },
])("array.filter (%p)", ({ inp, func }) => {
    const result = util.transpileAndExecute(
        `return JSONStringify([${inp.toString()}].filter(${func}))`,
    );

    expect(result).toBe(JSON.stringify(inp.filter(eval(func))));
});

test.each([
    { inp: [], func: "x => x > 1" },
    { inp: [0, 1, 2, 3], func: "x => x > 1" },
    { inp: [false, true, false], func: "x => x" },
    { inp: [true, true, true], func: "x => x" },
])("array.every (%p)", ({ inp, func }) => {
    const result = util.transpileAndExecute(
        `return JSONStringify([${inp.toString()}].every(${func}))`,
    );

    expect(result).toBe(JSON.stringify(inp.every(eval(func))));
});

test.each([
    { inp: [], func: "x => x > 1" },
    { inp: [0, 1, 2, 3], func: "x => x > 1" },
    { inp: [false, true, false], func: "x => x" },
    { inp: [true, true, true], func: "x => x" },
])("array.some (%p)", ({ inp, func }) => {
    const result = util.transpileAndExecute(
        `return JSONStringify([${inp.toString()}].some(${func}))`,
    );

    expect(result).toBe(JSON.stringify(inp.some(eval(func))));
});

test.each([
    { inp: [], start: 1, end: 2 },
    { inp: [0, 1, 2, 3], start: 1, end: 2 },
    { inp: [0, 1, 2, 3], start: 1, end: 1 },
    { inp: [0, 1, 2, 3], start: 1, end: -1 },
    { inp: [0, 1, 2, 3], start: -3, end: -1 },
    { inp: [0, 1, 2, 3, 4, 5], start: 1, end: 3 },
    { inp: [0, 1, 2, 3, 4, 5], start: 3 },
])("array.slice (%p)", ({ inp, start, end }) => {
    const result = util.transpileAndExecute(
        `return JSONStringify([${inp.toString()}].slice(${start}, ${end}))`,
    );

    expect(result).toBe(JSON.stringify(inp.slice(start, end)));
});

test.each([
    { inp: [], start: 0, deleteCount: 0, newElements: [9, 10, 11] },
    { inp: [0, 1, 2, 3], start: 1, deleteCount: 0, newElements: [9, 10, 11] },
    { inp: [0, 1, 2, 3], start: 2, deleteCount: 2, newElements: [9, 10, 11] },
    { inp: [0, 1, 2, 3], start: 4, deleteCount: 1, newElements: [8, 9] },
    { inp: [0, 1, 2, 3], start: 4, deleteCount: 0, newElements: [8, 9] },
    { inp: [0, 1, 2, 3, 4, 5], start: 5, deleteCount: 9, newElements: [10, 11] },
    { inp: [0, 1, 2, 3, 4, 5], start: 3, deleteCount: 2, newElements: [3, 4, 5] },
])("array.splice[Insert] (%p)", ({ inp, start, deleteCount, newElements }) => {
    const result = util.transpileAndExecute(
        `let spliceTestTable = [${inp.toString()}];
        spliceTestTable.splice(${start}, ${deleteCount}, ${newElements});
        return JSONStringify(spliceTestTable);`,
    );

    inp.splice(start, deleteCount, ...newElements);
    expect(result).toBe(JSON.stringify(inp));
});

test.each([
    { inp: [], start: 1, deleteCount: 1 },
    { inp: [0, 1, 2, 3], start: 1, deleteCount: 1 },
    { inp: [0, 1, 2, 3], start: 10, deleteCount: 1 },
    { inp: [0, 1, 2, 3], start: 4 },
    { inp: [0, 1, 2, 3, 4, 5], start: 3 },
    { inp: [0, 1, 2, 3, 4, 5], start: 2, deleteCount: 2 },
    { inp: [0, 1, 2, 3, 4, 5, 6, 7, 8], start: 5, deleteCount: 9, newElements: [10, 11] },
])("array.splice[Remove] (%p)", ({ inp, start, deleteCount, newElements = [] }) => {
    let result;
    if (deleteCount) {
        result = util.transpileAndExecute(
            `let spliceTestTable = [${inp.toString()}];
           spliceTestTable.splice(${start}, ${deleteCount}, ${newElements});
           return JSONStringify(spliceTestTable);`,
        );
    } else {
        result = util.transpileAndExecute(
            `let spliceTestTable = [${inp.toString()}];
           spliceTestTable.splice(${start});
           return JSONStringify(spliceTestTable);`,
        );
    }

    if (deleteCount) {
        inp.splice(start, deleteCount, ...newElements);
        expect(result).toBe(JSON.stringify(inp));
    } else {
        inp.splice(start);
        expect(result).toBe(JSON.stringify(inp));
    }
});

test.each([
    { arr: [], args: [[]] },
    { arr: [1, 2, 3], args: [[]] },
    { arr: [1, 2, 3], args: [[4]] },
    { arr: [1, 2, 3], args: [[4, 5]] },
    { arr: [1, 2, 3], args: [[4, 5]] },
    { arr: [1, 2, 3], args: [4, [5]] },
    { arr: [1, 2, 3], args: [4, [5, 6]] },
    { arr: [1, 2, 3], args: [4, [5, 6], 7] },
    { arr: [1, 2, 3], args: ["test", [5, 6], 7, ["test1", "test2"]] },
    { arr: [1, 2, "test"], args: ["test", ["test1", "test2"]] },
])("array.concat (%p)", ({ arr, args }: { arr: any[]; args: any[] }) => {
    const argStr = args.map(arg => JSON.stringify(arg)).join(",");

    const result = util.transpileAndExecute(
        `let concatTestTable: any[] = ${JSON.stringify(arr)};
        return JSONStringify(concatTestTable.concat(${argStr}));`,
    );

    const concatArr = arr.concat(...args);
    expect(result).toBe(JSON.stringify(concatArr));
});

test.each([
    { inp: [] },
    { inp: ["test1"] },
    { inp: ["test1", "test2"] },
    { inp: ["test1", "test2"], separator: ";" },
    { inp: ["test1", "test2"], separator: "" },
])("array.join (%p)", ({ inp, separator }) => {
    let separatorLua;
    if (separator === "") {
        separatorLua = '""';
    } else if (separator) {
        separatorLua = '"' + separator + '"';
    } else {
        separatorLua = "";
    }
    const result = util.transpileAndExecute(
        `let joinTestTable = ${JSON.stringify(inp)};
        return joinTestTable.join(${separatorLua});`,
    );

    const joinedInp = inp.join(separator);
    expect(result).toBe(joinedInp);
});

test.each([
    { inp: [], element: "test1" },
    { inp: ["test1"], element: "test1" },
    { inp: ["test1", "test2"], element: "test2" },
    { inp: ["test1", "test2", "test3"], element: "test3", fromIndex: 1 },
    { inp: ["test1", "test2", "test3"], element: "test1", fromIndex: 2 },
    { inp: ["test1", "test2", "test3"], element: "test1", fromIndex: -2 },
    { inp: ["test1", "test2", "test3"], element: "test1", fromIndex: 12 },
])("array.indexOf (%p)", ({ inp, element, fromIndex }) => {
    let str = `return ${JSON.stringify(inp)}.indexOf("${element}");`;
    if (fromIndex) {
        str = `return ${JSON.stringify(inp)}.indexOf("${element}", ${fromIndex});`;
    }

    const result = util.transpileAndExecute(str);

    // Account for lua indexing (-1)
    expect(result).toBe(inp.indexOf(element, fromIndex));
});

test.each([{ inp: [1, 2, 3], expected: 3 }, { inp: [1, 2, 3, 4, 5], expected: 3 }])(
    "array.destructuring.simple (%p)",
    ({ inp, expected }) => {
        const result = util.transpileAndExecute(
            `let [x, y, z] = ${JSON.stringify(inp)}
            return z;`,
        );

        expect(result).toBe(expected);
    },
);

test.each([{ inp: [1] }, { inp: [1, 2, 3] }])("array.push (%p)", ({ inp }) => {
    const result = util.transpileAndExecute(
        `let testArray = [0];
        testArray.push(${inp.join(", ")});
        return JSONStringify(testArray);`,
    );

    expect(result).toBe(JSON.stringify([0].concat(inp)));
});

test.each([
    { array: "[1, 2, 3]", expected: [3, 2] },
    { array: "[1, 2, 3, null]", expected: [3, 2] },
])("array.pop (%p)", ({ array, expected }) => {
    {
        const result = util.transpileAndExecute(
            `let testArray = ${array};
            let val = testArray.pop();
            return val`,
        );

        expect(result).toBe(expected[0]);
    }
    {
        const result = util.transpileAndExecute(
            `let testArray = ${array};
            testArray.pop();
            return testArray.length`,
        );

        expect(result).toBe(expected[1]);
    }
});

test.each([
    { array: "[1, 2, 3]", expected: [3, 2, 1] },
    { array: "[1, 2, 3, null]", expected: [3, 2, 1] },
    { array: "[1, 2, 3, 4]", expected: [4, 3, 2, 1] },
    { array: "[1]", expected: [1] },
    { array: "[]", expected: [] },
])("array.reverse (%p)", ({ array, expected }) => {
    const result = util.transpileAndExecute(
        `let testArray = ${array};
        let val = testArray.reverse();
        return JSONStringify(testArray)`,
    );
    expect(result).toBe(JSON.stringify(expected));
});

test.each([
    { array: "[1, 2, 3]", expectedArray: [2, 3], expectedValue: 1 },
    { array: "[1]", expectedArray: [], expectedValue: 1 },
    { array: "[]", expectedArray: [], expectedValue: undefined },
])("array.shift (%p)", ({ array, expectedArray, expectedValue }) => {
    {
        // test array mutation
        {
            const result = util.transpileAndExecute(
                `let testArray = ${array};
                let val = testArray.shift();
                return JSONStringify(testArray)`,
            );
            expect(result).toBe(JSON.stringify(expectedArray));
        }
        // test return value
        {
            const result = util.transpileAndExecute(
                `let testArray = ${array};
                let val = testArray.shift();
                return val`,
            );

            expect(result).toBe(expectedValue);
        }
    }
});

test.each([
    { array: "[3, 4, 5]", toUnshift: [1, 2], expected: [1, 2, 3, 4, 5] },
    { array: "[]", toUnshift: [], expected: [] },
    { array: "[1]", toUnshift: [], expected: [1] },
    { array: "[]", toUnshift: [1], expected: [1] },
])("array.unshift (%p)", ({ array, toUnshift, expected }) => {
    const result = util.transpileAndExecute(
        `let testArray = ${array};
        testArray.unshift(${toUnshift});
        return JSONStringify(testArray)`,
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([
    { array: "[4, 5, 3, 2, 1]", expected: [1, 2, 3, 4, 5] },
    { array: "[1]", expected: [1] },
    { array: "[1, null]", expected: [1] },
    { array: "[]", expected: [] },
])("array.sort (%p)", ({ array, expected }) => {
    const result = util.transpileAndExecute(
        `let testArray = ${array};
        testArray.sort();
        return JSONStringify(testArray)`,
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([
    { array: [1, 2, 3, 4, 5], compareStr: "a - b", compareFn: (a: any, b: any) => a - b },
    {
        array: ["4", "5", "3", "2", "1"],
        compareStr: "tonumber(a) - tonumber(b)",
        compareFn: (a: any, b: any) => Number(a) - Number(b),
    },
    {
        array: ["4", "5", "3", "2", "1"],
        compareStr: "tonumber(b) - tonumber(a)",
        compareFn: (a: any, b: any) => Number(b) - Number(a),
    },
])("array.sort with compare function (%p)", ({ array, compareStr, compareFn }) => {
    const result = util.transpileAndExecute(
        `let testArray = ${JSON.stringify(array)};
        testArray.sort((a, b) => ${compareStr});
        return JSONStringify(testArray)`,
        undefined,
        undefined,
        `declare function tonumber(this: void, e: any): number`,
    );

    expect(result).toBe(JSON.stringify(array.sort(compareFn)));
});

test.each([
    { array: [1, [2, 3], 4], expected: [1, 2, 3, 4] },
    { array: [1, [2, 3], 4], depth: 0, expected: [1, [2, 3], 4] },
    { array: [1, [[2], [3]], 4], expected: [1, [2], [3], 4] },
    { array: [1, [[[2], [3]]], 4], depth: Infinity, expected: [1, 2, 3, 4] },
])("array.flat (%p)", ({ array, depth, expected }) => {
    // TODO: Remove once `Infinity` would be implemented
    const luaDepth = depth === Infinity ? "1 / 0" : depth;
    const result = util.transpileAndExecute(`
        return JSONStringify(${JSON.stringify(array)}.flat(${luaDepth}))
    `);

    expect(JSON.parse(result)).toEqual(expected);
});

test.each([
    { array: [1, [2, 3], [4]], map: <T>(value: T) => value, expected: [1, 2, 3, 4] },
    { array: [1, 2, 3], map: (v: number) => v * 2, expected: [2, 4, 6] },
    { array: [1, 2, 3], map: (v: number) => [v, v * 2], expected: [1, 2, 2, 4, 3, 6] },
    { array: [1, 2, 3], map: (v: number) => [v, [v]], expected: [1, [1], 2, [2], 3, [3]] },
    { array: [1, 2, 3], map: (v: number, i: number) => [v * 2 * i], expected: [0, 4, 12] },
])("array.flatMap (%p)", ({ array, map, expected }) => {
    const result = util.transpileAndExecute(`
        const array = ${JSON.stringify(array)};
        const result = array.flatMap(${map.toString()});
        return JSONStringify(result);
    `);

    // TODO(node 12): array.flatMap(map)
    expect(JSON.parse(result)).toEqual(expected);
});

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
         return delay();`,
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
        objectFromEntriesDeclaration,
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
        objectFromEntriesDeclaration,
    );

    expect(JSON.parse(result)).toEqual({ foo: "bar" });
});
