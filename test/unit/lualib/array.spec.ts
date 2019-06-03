import * as util from "../../util";

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("forEach (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
        arrTest.forEach((elem, index) => {
            arrTest[index] = arrTest[index] + 1;
        })
        return JSONStringify(arrTest);`
    );

    expect(JSON.parse(result)).toEqual(expected);
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
        }));`
    );

    expect(result).toEqual(expected);
});

test.each([{ inp: [0, 2, 4, 8], expected: 3, value: 8 }, { inp: [0, 2, 4, 8], expected: 1, value: 2 }])(
    "array.findIndex[index] (%p)",
    ({ inp, expected, value }) => {
        const result = util.transpileAndExecute(
            `let arrTest = ${JSON.stringify(inp)};
        return JSONStringify(arrTest.findIndex((elem, index, arr) => {
            return index === ${expected} && arr[${expected}] === ${value};
        }));`
        );

        expect(result).toEqual(expected);
    }
);

test.each([
    { inp: [], func: "x => x" },
    { inp: [0, 1, 2, 3], func: "x => x" },
    { inp: [0, 1, 2, 3], func: "x => x*2" },
    { inp: [1, 2, 3, 4], func: "x => -x" },
    { inp: [0, 1, 2, 3], func: "x => x+2" },
    { inp: [0, 1, 2, 3], func: "x => x%2 == 0 ? x + 1 : x - 1" },
])("array.map (%p)", ({ inp, func }) => {
    const result = util.transpileAndExecute(`return JSONStringify([${inp.toString()}].map(${func}))`);

    expect(JSON.parse(result)).toEqual(inp.map(eval(func)));
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
    const result = util.transpileAndExecute(`return JSONStringify([${inp.toString()}].filter(${func}))`);

    expect(JSON.parse(result)).toEqual(inp.filter(eval(func)));
});

test.each([
    { inp: [], func: "x => x > 1" },
    { inp: [0, 1, 2, 3], func: "x => x > 1" },
    { inp: [false, true, false], func: "x => x" },
    { inp: [true, true, true], func: "x => x" },
])("array.every (%p)", ({ inp, func }) => {
    const result = util.transpileAndExecute(`return JSONStringify([${inp.toString()}].every(${func}))`);

    expect(JSON.parse(result)).toEqual(inp.every(eval(func)));
});

test.each([
    { inp: [], func: "x => x > 1" },
    { inp: [0, 1, 2, 3], func: "x => x > 1" },
    { inp: [false, true, false], func: "x => x" },
    { inp: [true, true, true], func: "x => x" },
])("array.some (%p)", ({ inp, func }) => {
    const result = util.transpileAndExecute(`return JSONStringify([${inp.toString()}].some(${func}))`);

    expect(JSON.parse(result)).toEqual(inp.some(eval(func)));
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
    const result = util.transpileAndExecute(`return JSONStringify([${inp.toString()}].slice(${start}, ${end}))`);

    expect(JSON.parse(result)).toEqual(inp.slice(start, end));
});

test("array.slice no argument", () => {
    const input = [2, 3, 4, 5];
    const result = util.transpileAndExecute(`return JSONStringify(${JSON.stringify(input)}.slice())`);

    expect(JSON.parse(result)).toEqual(input);
});

test.each([
    { inp: [], start: 0, deleteCount: 0, newElements: [9, 10, 11] },
    { inp: [0, 1, 2, 3], start: 1, deleteCount: 0, newElements: [9, 10, 11] },
    { inp: [0, 1, 2, 3], start: 2, deleteCount: 2, newElements: [9, 10, 11] },
    { inp: [0, 1, 2, 3], start: 4, deleteCount: 1, newElements: [8, 9] },
    { inp: [0, 1, 2, 3], start: 4, deleteCount: 0, newElements: [8, 9] },
    { inp: [0, 1, 2, 3], start: -2, deleteCount: 0, newElements: [8, 9] },
    { inp: [0, 1, 2, 3], start: -3, deleteCount: 0, newElements: [8, 9] },
    { inp: [0, 1, 2, 3, 4, 5], start: 5, deleteCount: 9, newElements: [10, 11] },
    { inp: [0, 1, 2, 3, 4, 5], start: 3, deleteCount: 2, newElements: [3, 4, 5] },
])("array.splice[Insert] (%p)", ({ inp, start, deleteCount, newElements }) => {
    const result = util.transpileAndExecute(
        `let spliceTestTable = [${inp.toString()}];
        spliceTestTable.splice(${start}, ${deleteCount}, ${newElements});
        return JSONStringify(spliceTestTable);`
    );

    inp.splice(start, deleteCount, ...newElements);
    expect(JSON.parse(result)).toEqual(inp);
});

test.each([
    { inp: [], start: 1, deleteCount: 1 },
    { inp: [0, 1, 2, 3], start: 1, deleteCount: 1 },
    { inp: [0, 1, 2, 3], start: 10, deleteCount: 1 },
    { inp: [0, 1, 2, 3], start: 1, deleteCount: undefined },
    { inp: [0, 1, 2, 3], start: 4 },
    { inp: [0, 1, 2, 3, 4, 5], start: 3 },
    { inp: [0, 1, 2, 3, 4, 5], start: -3 },
    { inp: [0, 1, 2, 3, 4, 5], start: -2 },
    { inp: [0, 1, 2, 3, 4, 5], start: 2, deleteCount: 2 },
    { inp: [0, 1, 2, 3, 4, 5, 6, 7, 8], start: 5, deleteCount: 9, newElements: [10, 11] },
])("array.splice[Remove] (%p)", ({ inp, start, deleteCount, newElements = [] }) => {
    let result;
    if (deleteCount) {
        result = util.transpileAndExecute(
            `let spliceTestTable = [${inp.toString()}];
           spliceTestTable.splice(${start}, ${deleteCount}, ${newElements});
           return JSONStringify(spliceTestTable);`
        );
    } else {
        result = util.transpileAndExecute(
            `let spliceTestTable = [${inp.toString()}];
           spliceTestTable.splice(${start});
           return JSONStringify(spliceTestTable);`
        );
    }

    if (deleteCount) {
        inp.splice(start, deleteCount, ...newElements);
        expect(JSON.parse(result)).toEqual(inp);
    } else {
        inp.splice(start);
        expect(JSON.parse(result)).toEqual(inp);
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
        return JSONStringify(concatTestTable.concat(${argStr}));`
    );

    const concatArr = arr.concat(...args);
    expect(JSON.parse(result)).toEqual(concatArr);
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
        return joinTestTable.join(${separatorLua});`
    );

    expect(result).toEqual(inp.join(separator));
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
    expect(result).toEqual(inp.indexOf(element, fromIndex));
});

test.each([{ inp: [1, 2, 3], expected: 3 }, { inp: [1, 2, 3, 4, 5], expected: 3 }])(
    "array.destructuring.simple (%p)",
    ({ inp, expected }) => {
        const result = util.transpileAndExecute(
            `let [x, y, z] = ${JSON.stringify(inp)}
            return z;`
        );

        expect(result).toEqual(expected);
    }
);

test.each([{ inp: [1] }, { inp: [1, 2, 3] }])("array.push (%p)", ({ inp }) => {
    const result = util.transpileAndExecute(
        `let testArray = [0];
        testArray.push(${inp.join(", ")});
        return JSONStringify(testArray);`
    );

    expect(JSON.parse(result)).toEqual([0].concat(inp));
});

test.each([{ array: "[1, 2, 3]", expected: [3, 2] }, { array: "[1, 2, 3, null]", expected: [3, 2] }])(
    "array.pop (%p)",
    ({ array, expected }) => {
        {
            const result = util.transpileAndExecute(
                `let testArray = ${array};
                let val = testArray.pop();
                return val`
            );

            expect(result).toEqual(expected[0]);
        }
        {
            const result = util.transpileAndExecute(
                `let testArray = ${array};
                testArray.pop();
                return testArray.length`
            );

            expect(result).toEqual(expected[1]);
        }
    }
);

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
        return JSONStringify(testArray)`
    );
    expect(JSON.parse(result)).toEqual(expected);
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
                return JSONStringify(testArray)`
            );
            expect(JSON.parse(result)).toEqual(expectedArray);
        }
        // test return value
        {
            const result = util.transpileAndExecute(
                `let testArray = ${array};
                let val = testArray.shift();
                return val`
            );

            expect(result).toEqual(expectedValue);
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
        return JSONStringify(testArray)`
    );

    expect(JSON.parse(result)).toEqual(expected);
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
        return JSONStringify(testArray)`
    );

    expect(JSON.parse(result)).toEqual(expected);
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
        `declare function tonumber(this: void, e: any): number`
    );

    expect(JSON.parse(result)).toEqual(array.sort(compareFn));
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
    (total: number, currentItem: number) => total + currentItem,
    (total: number, currentItem: number) => total * currentItem,
])("array reduce (%p)", reducer => {
    const array = [1, 3, 5, 7];

    const result = util.transpileAndExecute(`
        const myArray = ${JSON.stringify(array)};
        return myArray.reduce(${reducer.toString()});
    `);

    expect(result).toEqual(array.reduce(reducer));
});

test.each([
    (total: number, currentItem: number) => total + currentItem,
    (total: number, currentItem: number) => total * currentItem,
])("array reduce with initial value (%p)", reducer => {
    const array = [1, 3, 5, 7];
    const initial = 10;

    const result = util.transpileAndExecute(`
        const myArray = ${JSON.stringify(array)};
        return myArray.reduce(${reducer.toString()}, ${initial});
    `);

    expect(result).toEqual(array.reduce(reducer, initial));
});

test("array reduce index & array arguments (%p)", () => {
    const array = [1, 3, 5, 7];
    const reducer = (total: number, _: number, index: number, array: number[]) => total + array[index];

    const result = util.transpileAndExecute(`
        const myArray = ${JSON.stringify(array)};
        return myArray.reduce(${reducer.toString()});
    `);

    expect(result).toEqual(array.reduce(reducer));
});

test("array reduce index & array arguments (%p)", () => {
    expect(() => {
        util.transpileAndExecute("return [].reduce((a, b) => a + b);");
    }).toThrow("Reduce of empty array with no initial value");
});
