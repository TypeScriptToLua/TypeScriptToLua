import * as util from "../../util";

test("omitted expression", () => {
    util.testFunction`
        const array = [1, , 2];
        return { a: array[0], b: array[1], c: array[2] };
    `.expectToMatchJsResult();
});

describe("access", () => {
    test("Array", () => {
        util.testFunction`
            const array: Array<number> = [3, 5, 1];
            return array[1];
        `.expectToMatchJsResult();
    });

    test("ReadonlyArray", () => {
        util.testFunction`
            const array: ReadonlyArray<number> = [3, 5, 1];
            return array[1];
        `.expectToMatchJsResult();
    });

    test("array literal", () => {
        util.testExpression`[3, 5, 1][1]`.expectToMatchJsResult();
    });

    test("const array literal", () => {
        util.testExpression`([3, 5, 1] as const)[1]`.expectToMatchJsResult();
    });

    test("tuple", () => {
        util.testFunction`
            const tuple: [number, number, number] = [3, 5, 1];
            return tuple[1];
        `.expectToMatchJsResult();
    });

    test("readonly tuple", () => {
        util.testFunction`
            const tuple: readonly [number, number, number] = [3, 5, 1];
            return tuple[1];
        `.expectToMatchJsResult();
    });

    test("union", () => {
        util.testFunction`
            const array: number[] | string[] = [3, 5, 1];
            return array[1];
        `.expectToMatchJsResult();
    });

    test("union with empty tuple", () => {
        util.testFunction`
            const array: number[] | [] = [3, 5, 1];
            return array[1];
        `.expectToMatchJsResult();
    });

    test("union with tuple", () => {
        util.testFunction`
            const tuple: number[] | [number, number, number] = [3, 5, 1];
            return tuple[1];
        `.expectToMatchJsResult();
    });

    test("access in call", () => {
        util.testExpression`[() => "foo", () => "bar"][0]()`.expectToMatchJsResult();
    });

    test("intersection", () => {
        util.testFunction`
            const array = Object.assign([3, 5, 1], { foo: "bar" });
            return { foo: array.foo, a: array[0], b: array[1], c: array[2] };
        `.expectToMatchJsResult();
    });

    test("with enum value index", () => {
        util.testFunction`
            enum TestEnum {
                A,
                B,
                C,
            }

            const array = ["a", "b", "c"];
            let index = TestEnum.A;
            return array[index];
        `.expectToMatchJsResult();
    });

    test.each([
        { member: "firstElement()", expected: 3 },
        { member: "name", expected: "array" },
        { member: "length", expected: 1 },
    ])("derived array (.%p)", ({ member, expected }) => {
        const luaHeader = `
            local array = {
                name = "array",
                firstElement = function(self) return self[1] end
            }
        `;

        util.testModule`
            interface CustomArray<T> extends Array<T> {
                name: string;
                firstElement(): number;
            };

            declare const array: CustomArray<number>;

            array[0] = 3;
            export const result = array.${member};
        `
            .setExport("result")
            .setLuaHeader(luaHeader)
            .expectToEqual(expected);
    });
});

describe("array.length", () => {
    describe("get", () => {
        test("union", () => {
            util.testFunction`
                const array: number[] | string[] = [3, 5, 1];
                return array.length;
            `.expectToMatchJsResult();
        });

        test("intersection", () => {
            util.testFunction`
                const array = Object.assign([3, 5, 1], { foo: "bar" });
                return array.length;
            `.expectToMatchJsResult();
        });

        test("tuple", () => {
            util.testFunction`
                const tuple: [number, number, number] = [3, 5, 1];
                return tuple.length;
            `.expectToMatchJsResult();
        });
    });

    describe("set", () => {
        test.each([{ length: 0, newLength: 0 }, { length: 1, newLength: 1 }, { length: 7, newLength: 3 }])(
            "removes extra elements",
            ({ length, newLength }) => {
                util.testFunction`
                    const array = [1, 2, 3];
                    array.length = ${length};
                    return array.length;
                `.expectToEqual(newLength);
            }
        );

        test.each([0, 1, 7])("returns right-hand side value", length => {
            util.testExpression`[1, 2, 3].length = ${length}`.expectToEqual(length);
        });

        test.each([-1, -7, 0.1, NaN, Infinity, -Infinity])("throws on invalid values (%p)", length => {
            util.testFunction`
                [1, 2, 3].length = ${length};
            `.expectToEqual(new util.ExecutionError(`invalid array length: ${length}`));
        });

        test("in array destructuring", () => {
            util.testFunction`
                const array = [0, 1, 2];
                [array.length] = [0];
                return array.length;
            `.expectToEqual(0);
        });

        test("in nested array destructuring", () => {
            util.testFunction`
                const array = [0, 1, 2];
                [[array.length]] = [[0]];
                return array.length;
            `.expectToEqual(0);
        });

        test("in object destructuring", () => {
            util.testFunction`
                const array = [0, 1, 2];
                ({ length: array.length } = { length: 0 });
                return array.length;
            `.expectToEqual(0);
        });

        test("in nested object destructuring", () => {
            util.testFunction`
                const array = [0, 1, 2];
                ({ obj: { length: array.length } } = { obj: { length: 0 } });
                return array.length;
            `.expectToEqual(0);
        });
    });
});

describe("delete", () => {
    test("deletes element", () => {
        util.testFunction`
            const array = [1, 2, 3, 4];
            delete array[2];
            return { a: array[0], b: array[1], c: array[2], d: array[3] };
        `.expectToMatchJsResult();
    });

    test("returns true when element exists", () => {
        util.testFunction`
            const array = [1, 2, 3, 4];
            const exists = delete array[2];
            return { exists, a: array[0], b: array[1], c: array[2], d: array[3] };
        `.expectToMatchJsResult();
    });

    test("returns false when element not exists", () => {
        util.testFunction`
            const array = [1, 2, 3, 4];
            const exists = delete array[4];
            return { exists, a: array[0], b: array[1], c: array[2], d: array[3] };
        `.expectToMatchJsResult();
    });
});

test("tuple.forEach", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3, 5, 1];
        let count = 0;
        tuple.forEach(value => {
            count += value;
        });
        return count;
    `.expectToMatchJsResult();
});

test("array.forEach (%p)", () => {
    util.testFunction`
        const array = [0, 1, 2, 3];
        array.forEach((elem, index) => {
            array[index] = array[index] + 1;
        });
        return array;
    `.expectToMatchJsResult();
});

test.each([
    { array: [], searchElement: 3 },
    { array: [0, 2, 4, 8], searchElement: 10 },
    { array: [0, 2, 4, 8], searchElement: 8 },
])("array.findIndex (%p)", ({ array, searchElement }) => {
    util.testFunction`
        const array = ${util.valueToString(array)};
        return array.findIndex((elem, index, arr) => elem === ${searchElement} && arr[index] === elem);
    `.expectToMatchJsResult();
});

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
    { array: [2, 3, 4, 5], args: [] },
    { array: [], args: [1, 2] },
    { array: [0, 1, 2, 3], args: [1, 2] },
    { array: [0, 1, 2, 3], args: [1, 1] },
    { array: [0, 1, 2, 3], args: [1, -1] },
    { array: [0, 1, 2, 3], args: [-3, -1] },
    { array: [0, 1, 2, 3, 4, 5], args: [1, 3] },
    { array: [0, 1, 2, 3, 4, 5], args: [3] },
])("array.slice (%p)", ({ array, args }) => {
    util.testExpression`${util.valueToString(array)}.slice(${util.valuesToString(args)})`.expectToMatchJsResult();
});

test.each([
    // Insert
    { array: [], start: 0, deleteCount: 0, newElements: [9, 10, 11] },
    { array: [0, 1, 2, 3], start: 1, deleteCount: 0, newElements: [9, 10, 11] },
    { array: [0, 1, 2, 3], start: 2, deleteCount: 2, newElements: [9, 10, 11] },
    { array: [0, 1, 2, 3], start: 4, deleteCount: 1, newElements: [8, 9] },
    { array: [0, 1, 2, 3], start: 4, deleteCount: 0, newElements: [8, 9] },
    { array: [0, 1, 2, 3], start: -2, deleteCount: 0, newElements: [8, 9] },
    { array: [0, 1, 2, 3], start: -3, deleteCount: 0, newElements: [8, 9] },
    { array: [0, 1, 2, 3, 4, 5], start: 5, deleteCount: 9, newElements: [10, 11] },
    { array: [0, 1, 2, 3, 4, 5], start: 3, deleteCount: 2, newElements: [3, 4, 5] },

    // Remove
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
])("array.splice (%p)", ({ array, start, deleteCount, newElements = [] }) => {
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
        const array: any[] = ${util.valueToString(array)};
        return array.concat(${util.valuesToString(args)});
    `.expectToMatchJsResult();
});

test.each([
    { array: [] },
    { array: ["test1"] },
    { array: ["test1", "test2"] },
    { array: ["test1", "test2"], separator: ";" },
    { array: ["test1", "test2"], separator: "" },
])("array.join (%p)", ({ array, separator }) => {
    util.testExpression`${util.valueToString(array)}.join(${util.valueToString(separator)})`.expectToMatchJsResult();
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

test.each([{ args: [1] }, { args: [1, 2, 3] }])("array.push (%p)", ({ args }) => {
    util.testFunction`
        const array = [0];
        const value = array.push(${util.valuesToString(args)});
        return { array, value };
    `.expectToMatchJsResult();
});

// tslint:disable-next-line: no-null-keyword
test.each([{ array: [1, 2, 3], expected: [3, 2] }, { array: [1, 2, 3, null], expected: [3, 2] }])(
    "array.pop (%p)",
    ({ array, expected }) => {
        util.testFunction`
            const array = ${util.valueToString(array)};
            const value = array.pop();
            return [value, array.length];
        `.expectToEqual(expected);
    }
);

test.each([{ array: [1, 2, 3] }, { array: [1, 2, 3, 4] }, { array: [1] }, { array: [] }])(
    "array.reverse (%p)",
    ({ array }) => {
        util.testFunction`
            const array = ${util.valueToString(array)};
            array.reverse();
            return array;
        `.expectToMatchJsResult();
    }
);

test.each([{ array: [1, 2, 3] }, { array: [1] }, { array: [] }])("array.shift (%p)", ({ array }) => {
    util.testFunction`
        const array = ${util.valueToString(array)};
        const value = array.shift();
        return { array, value };
    `.expectToMatchJsResult();
});

test.each([
    { array: [3, 4, 5], args: [1, 2] },
    { array: [], args: [] },
    { array: [1], args: [] },
    { array: [], args: [1] },
])("array.unshift (%p)", ({ array, args }) => {
    util.testFunction`
        const array = ${util.valueToString(array)};
        const value = array.unshift(${util.valuesToString(args)});
        return { array, value };
    `.expectToMatchJsResult();
});

test.each([{ array: [4, 5, 3, 2, 1] }, { array: [1] }, { array: [] }])("array.sort (%p)", ({ array }) => {
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

test.each<[[(total: number, currentItem: number, index: number, array: number[]) => number, number?]]>([
    [[(total, currentItem) => total + currentItem]],
    [[(total, currentItem) => total * currentItem]],
    [[(total, currentItem) => total + currentItem, 10]],
    [[(total, currentItem) => total * currentItem, 10]],
    [[(total, _, index, array) => total + array[index]]],
    [[(a, b) => a + b]],
])("array.reduce (%p)", args => {
    util.testExpression`[1, 3, 5, 7].reduce(${util.valuesToString(args)})`.expectToMatchJsResult();
});

const genericChecks = [
    "function generic<T extends number[]>(array: T)",
    "function generic<T extends [...number[]]>(array: T)",
    "function generic<T extends any>(array: T[])",
    "type ArrayType = number[]; function generic<T extends ArrayType>(array: T)",
    "function generic<T extends number[]>(array: T & {})",
    "function generic<T extends number[] & {}>(array: T)",
];

test.each(genericChecks)("array constrained generic foreach (%p)", signature => {
    const code = `
            ${signature}: number {
                let sum = 0;
                array.forEach(item => {
                    if (typeof item === "number") {
                        sum += item;
                    }
                });
                return sum;
            }
            return generic([1, 2, 3]);
        `;
    expect(util.transpileAndExecute(code)).toBe(6);
});

test.each(genericChecks)("array constrained generic length (%p)", signature => {
    const code = `
            ${signature}: number {
                return array.length;
            }
            return generic([1, 2, 3]);
        `;
    expect(util.transpileAndExecute(code)).toBe(3);
});
