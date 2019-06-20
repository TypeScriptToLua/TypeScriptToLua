import * as util from "../../util";

test.each([[0, 1, 2, 3]])("forEach (%p)", (...array) => {
    util.testFunction`
        let arrTest = ${util.valueToString(array)};
        arrTest.forEach((elem, index) => {
            arrTest[index] = arrTest[index] + 1;
        })
        return arrTest;
    `.expectToMatchJsResult();
});

test.each([
    { array: [], searchElement: 3 },
    { array: [0, 2, 4, 8], searchElement: 10 },
    { array: [0, 2, 4, 8], searchElement: 8 },
])("array.findIndex[value] (%p)", ({ array, searchElement }) => {
    util.testFunction`
        let arrTest = ${util.valueToString(array)};
        return arrTest.findIndex((elem, index) => elem === ${searchElement});
    `.expectToMatchJsResult();
});

test.each([{ array: [0, 2, 4, 8], expected: 3, value: 8 }, { array: [0, 2, 4, 8], expected: 1, value: 2 }])(
    "array.findIndex[index] (%p)",
    ({ array, expected, value }) => {
        util.testFunctionTemplate`
            let array = ${array};
            return array.findIndex((elem, index, arr) => {
                return index === ${expected} && arr[${expected}] === ${value};
            });
        `.expectToMatchJsResult();
    }
);

test.each([
    { array: [], func: "x => x" },
    { array: [0, 1, 2, 3], func: "x => x" },
    { array: [0, 1, 2, 3], func: "x => x*2" },
    { array: [1, 2, 3, 4], func: "x => -x" },
    { array: [0, 1, 2, 3], func: "x => x+2" },
    { array: [0, 1, 2, 3], func: "x => x%2 == 0 ? x + 1 : x - 1" },
])("array.map (%p)", ({ array, func }) => {
    util.testExpression`${util.valueToString(array)}.map(${func})`.expectToMatchJsResult();
});

test.each([
    { array: [], func: "x => x > 1" },
    { array: [0, 1, 2, 3], func: "x => x > 1" },
    { array: [0, 1, 2, 3], func: "x => x < 3" },
    { array: [0, 1, 2, 3], func: "x => x < 0" },
    { array: [0, -1, -2, -3], func: "x => x < 0" },
    { array: [0, 1, 2, 3], func: "() => true" },
    { array: [0, 1, 2, 3], func: "() => false" },
])("array.filter (%p)", ({ array, func }) => {
    util.testExpression`${util.valueToString(array)}.filter(${func})`.expectToMatchJsResult();
});

test.each([
    { array: [], func: "x => x > 1" },
    { array: [0, 1, 2, 3], func: "x => x > 1" },
    { array: [false, true, false], func: "x => x" },
    { array: [true, true, true], func: "x => x" },
])("array.every (%p)", ({ array, func }) => {
    util.testExpression`${util.valueToString(array)}.every(${func})`.expectToMatchJsResult();
});

test.each([
    { array: [], func: "x => x > 1" },
    { array: [0, 1, 2, 3], func: "x => x > 1" },
    { array: [false, true, false], func: "x => x" },
    { array: [true, true, true], func: "x => x" },
])("array.some (%p)", ({ array, func }) => {
    util.testExpression`${util.valueToString(array)}.some(${func})`.expectToMatchJsResult();
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
    util.testExpression`${util.valueToString(inp)}.slice(${start}, ${end})`.expectToMatchJsResult();
});

test("array.slice no argument", () => {
    util.testExpression`[2, 3, 4, 5].slice()`.expectToMatchJsResult();
});

test.each([
    { array: [], start: 0, deleteCount: 0, newElements: [9, 10, 11] },
    { array: [0, 1, 2, 3], start: 1, deleteCount: 0, newElements: [9, 10, 11] },
    { array: [0, 1, 2, 3], start: 2, deleteCount: 2, newElements: [9, 10, 11] },
    { array: [0, 1, 2, 3], start: 4, deleteCount: 1, newElements: [8, 9] },
    { array: [0, 1, 2, 3], start: 4, deleteCount: 0, newElements: [8, 9] },
    { array: [0, 1, 2, 3], start: -2, deleteCount: 0, newElements: [8, 9] },
    { array: [0, 1, 2, 3], start: -3, deleteCount: 0, newElements: [8, 9] },
    { array: [0, 1, 2, 3, 4, 5], start: 5, deleteCount: 9, newElements: [10, 11] },
    { array: [0, 1, 2, 3, 4, 5], start: 3, deleteCount: 2, newElements: [3, 4, 5] },
])("array.splice[Insert] (%p)", ({ array, start, deleteCount, newElements }) => {
    util.testFunction`
        const array = ${util.valueToString(array)};
        array.splice(${start}, ${deleteCount}, ${util.valuesToString(newElements)});
        return array;
    `.expectToMatchJsResult();
});

test.each([
    { array: [], start: 1, deleteCount: 1 },
    { array: [0, 1, 2, 3], start: 1, deleteCount: 1 },
    { array: [0, 1, 2, 3], start: 10, deleteCount: 1 },
    { array: [0, 1, 2, 3], start: 1, deleteCount: undefined },
    { array: [0, 1, 2, 3], start: 4 },
    { array: [0, 1, 2, 3, 4, 5], start: 3 },
    { array: [0, 1, 2, 3, 4, 5], start: -3 },
    { array: [0, 1, 2, 3, 4, 5], start: -2 },
    { array: [0, 1, 2, 3, 4, 5], start: 2, deleteCount: 2 },
    { array: [0, 1, 2, 3, 4, 5, 6, 7, 8], start: 5, deleteCount: 9, newElements: [10, 11] },
])("array.splice[Remove] (%p)", ({ array, start, deleteCount, newElements = [] }) => {
    util.testFunction`
        const array = ${util.valueToString(array)};
        array.splice(${util.valuesToString([start, deleteCount, ...newElements])});
        return array;
    `.expectToMatchJsResult();
});

test.each([
    { array: [], args: [[]] },
    { array: [1, 2, 3], args: [[]] },
    { array: [1, 2, 3], args: [[4]] },
    { array: [1, 2, 3], args: [[4, 5]] },
    { array: [1, 2, 3], args: [[4, 5]] },
    { array: [1, 2, 3], args: [4, [5]] },
    { array: [1, 2, 3], args: [4, [5, 6]] },
    { array: [1, 2, 3], args: [4, [5, 6], 7] },
    { array: [1, 2, 3], args: ["test", [5, 6], 7, ["test1", "test2"]] },
    { array: [1, 2, "test"], args: ["test", ["test1", "test2"]] },
])("array.concat (%p)", ({ array, args }) => {
    util.testFunction`
        let concatTestTable: any[] = ${util.valueToString(array)};
        return concatTestTable.concat(${util.valuesToString(args)});
    `.expectToMatchJsResult();
});

test.each([
    { array: [] },
    { array: ["test1"] },
    { array: ["test1", "test2"] },
    { array: ["test1", "test2"], separator: ";" },
    { array: ["test1", "test2"], separator: "" },
])("array.join (%p)", ({ array, separator }) => {
    util.testFunction`
        const joinTestTable = ${util.valueToString(array)};
        return joinTestTable.join(${util.valueToString(separator)});
    `.expectToMatchJsResult();
});

test.each([
    { array: [], args: ["test1"] },
    { array: ["test1"], args: ["test1"] },
    { array: ["test1", "test2"], args: ["test2"] },
    { array: ["test1", "test2", "test3"], args: ["test3", 1] },
    { array: ["test1", "test2", "test3"], args: ["test1", 2] },
    { array: ["test1", "test2", "test3"], args: ["test1", -2] },
    { array: ["test1", "test2", "test3"], args: ["test1", 12] },
])("array.indexOf (%p)", ({ array, args }) => {
    util.testExpression`${util.valueToString(array)}.indexOf(${util.valuesToString(args)})`.expectToMatchJsResult();
});

// TODO: Unrelated to lib
test.each([[1, 2, 3], [1, 2, 3, 4, 5]])("array.destructuring.simple (%p)", (...array) => {
    util.testFunction`
        let [x, y, z] = ${util.valueToString(array)}
        return z;
    `.expectToMatchJsResult();
});

test.each([[1], [1, 2, 3]])("array.push (%p)", (...args) => {
    util.testFunction`
        let testArray = [0];
        testArray.push(${util.valuesToString(args)});
        return testArray;
    `.expectToMatchJsResult();
});

// tslint:disable-next-line: no-null-keyword
test.each([{ array: [1, 2, 3], expected: [3, 2] }, { array: [1, 2, 3, null], expected: [3, 2] }])(
    "array.pop (%p)",
    ({ array, expected }) => {
        util.testFunction`
            let array = ${util.valueToString(array)};
            let value = array.pop();
            return [value, array.length];
        `.expectToEqual(expected);
    }
);

test.each([[1, 2, 3], [1, 2, 3, 4], [1], []])("array.reverse (%p)", (...array) => {
    util.testFunction`
        let array = ${util.valueToString(array)};
        let val = array.reverse();
        return array
    `.expectToMatchJsResult();
});

test.each([[1, 2, 3], [1], []])("array.shift (%p)", (...array) => {
    util.testFunction`
        let array = ${util.valueToString(array)};
        let value = array.shift();
        return { array, value }
    `.expectToMatchJsResult();
});

test.each([
    { array: "[3, 4, 5]", args: [1, 2] },
    { array: "[]", args: [] },
    { array: "[1]", args: [] },
    { array: "[]", args: [1] },
])("array.unshift (%p)", ({ array, args }) => {
    util.testFunction`
        let array = ${array};
        array.unshift(${util.valuesToString(args)});
        return array;
    `.expectToMatchJsResult();
});

test.each([[[4, 5, 3, 2, 1]], [[1]], [[]]])("array.sort (%p)", array => {
    util.testFunctionTemplate`
        const array = ${array};
        array.sort();
        return array;
    `.expectToMatchJsResult();
});

test.each([
    { array: [1, 2, 3, 4, 5], compare: (a: number, b: number) => a - b },
    { array: ["4", "5", "3", "2", "1"], compare: (a: string, b: string) => Number(a) - Number(b) },
    { array: ["4", "5", "3", "2", "1"], compare: (a: string, b: string) => Number(b) - Number(a) },
])("array.sort with compare function (%p)", ({ array, compare }) => {
    util.testFunctionTemplate`
        const array = ${array};
        array.sort(${compare});
        return array;
    `.expectToMatchJsResult();
});

test.each([
    { array: [1, [2, 3], 4], expected: [1, 2, 3, 4] },
    { array: [1, [2, 3], 4], depth: 0, expected: [1, [2, 3], 4] },
    { array: [1, [[2], [3]], 4], expected: [1, [2], [3], 4] },
    { array: [1, [[[2], [3]]], 4], depth: Infinity, expected: [1, 2, 3, 4] },
])("array.flat (%p)", ({ array, depth, expected }) => {
    // TODO: Node 12
    util.testExpressionTemplate`${array}.flat(${depth})`.expectToEqual(expected);
});

test.each([
    { array: [1, [2, 3], [4]], map: <T>(value: T) => value, expected: [1, 2, 3, 4] },
    { array: [1, 2, 3], map: (v: number) => v * 2, expected: [2, 4, 6] },
    { array: [1, 2, 3], map: (v: number) => [v, v * 2], expected: [1, 2, 2, 4, 3, 6] },
    { array: [1, 2, 3], map: (v: number) => [v, [v]], expected: [1, [1], 2, [2], 3, [3]] },
    { array: [1, 2, 3], map: (v: number, i: number) => [v * 2 * i], expected: [0, 4, 12] },
])("array.flatMap (%p)", ({ array, map, expected }) => {
    // TODO: Node 12
    util.testExpressionTemplate`${array}.flatMap(${map})`.expectToEqual(expected);
});

test.each<(total: number, currentItem: number) => number>([
    (total, currentItem) => total + currentItem,
    (total, currentItem) => total * currentItem,
])("array reduce (%p)", reducer => {
    util.testExpressionTemplate`[1, 3, 5, 7].reduce(${reducer})`.expectToMatchJsResult();
});

test.each<(total: number, currentItem: number) => number>([
    (total, currentItem) => total + currentItem,
    (total, currentItem) => total * currentItem,
])("array reduce with initial value (%p)", reducer => {
    util.testExpressionTemplate`[1, 3, 5, 7].reduce(${reducer}, 10)`.expectToMatchJsResult();
});

test("array reduce index & array arguments (%p)", () => {
    util.testExpression`[1, 3, 5, 7].reduce((total, _, index, array) => total + array[index])`.expectToMatchJsResult();
});

test("array reduce index & array arguments (%p)", () => {
    util.testExpression`[].reduce((a, b) => a + b)`.expectToEqual(
        new util.ExecutionError("Reduce of empty array with no initial value")
    );
});
