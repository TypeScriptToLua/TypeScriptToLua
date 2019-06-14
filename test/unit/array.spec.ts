import * as util from "../util";

test("Array access", () => {
    util.testFunction`
        const arr: Array<number> = [3, 5, 1];
        return arr[1];
    `.expectToMatchJsResult();
});

test("ReadonlyArray access", () => {
    util.testFunction`
        const arr: ReadonlyArray<number> = [3, 5, 1];
        return arr[1];
    `.expectToMatchJsResult();
});

test("Array literal access", () => {
    util.testFunction`
        const arr: number[] = [3, 5, 1];
        return arr[1];
    `.expectToMatchJsResult();
});

test("Readonly array literal access", () => {
    util.testFunction`
        const arr: readonly number[] = [3, 5, 1];
        return arr[1];
    `.expectToMatchJsResult();
});

test("Array union access", () => {
    util.testFunction`
        function makeArray(): number[] | string[] { return [3, 5, 1]; }
        const arr = makeArray();
        return arr[1];
    `.expectToMatchJsResult();
});

test("Array union access with empty tuple", () => {
    util.testFunction`
        function makeArray(): number[] | [] { return [3, 5, 1]; }
        const arr = makeArray();
        return arr[1];
    `.expectToMatchJsResult();
});

test("Array union length", () => {
    util.testFunction`
        function makeArray(): number[] | string[] { return [3, 5, 1]; }
        const arr = makeArray();
        return arr.length;
    `.expectToMatchJsResult();
});

test("Array intersection access", () => {
    util.testFunction`
        type I = number[] & { foo: string };
        function makeArray(): I {
            let t = [3, 5, 1];
            (t as I).foo = "bar";
            return (t as I);
        }
        const arr = makeArray();
        return arr[1];
    `.expectToMatchJsResult();
});

test("Array intersection length", () => {
    util.testFunction`
        type I = number[] & { foo: string };
        function makeArray(): I {
            let t = [3, 5, 1];
            (t as I).foo = "bar";
            return (t as I);
        }
        const arr = makeArray();
        return arr.length;
    `.expectToMatchJsResult();
});

test.each([
    { member: "firstElement()", expected: 3 },
    { member: "name", expected: "array" },
    { member: "length", expected: 1 },
])("Derived array access (%p)", ({ member, expected }) => {
    const luaHeader = `
        local arr = {
            name = "array",
            firstElement = function(self) return self[1] end
        }
    `;

    const tsHeader = `
        interface CustomArray<T> extends Array<T> {
            name: string;
            firstElement(): number;
        };

        declare const arr: CustomArray<number>;
    `;

    util.testFunction`
        arr[0] = 3;
        return arr.${member};
    `
        .luaHeader(luaHeader)
        .tsHeader(tsHeader)
        .expectToEqual(expected);
});

test("Array delete", () => {
    util.testFunction`
        const array = [1, 2, 3, 4];
        delete array[2];
        return { a: array[0], b: array[1], c: array[2], d: array[3] };
    `.expectToMatchJsResult();
});

test("Array delete return true", () => {
    util.testFunction`
        const array = [1, 2, 3, 4];
        const exists = delete array[2];
        return { exists, a: array[0], b: array[1], c: array[2], d: array[3] };
    `.expectToMatchJsResult();
});

test("Array delete return false", () => {
    util.testFunction`
        const array = [1, 2, 3, 4];
        const exists = delete array[4];
        return { exists, a: array[0], b: array[1], c: array[2], d: array[3] };
    `.expectToMatchJsResult();
});

test("Array property access", () => {
    util.testFunction`
        type A = number[] & { foo?: string };
        const a: A = [1, 2, 3];
        a.foo = "bar";
        return { foo: a.foo, a: a[0], b: a[1], c: a[2] };
    `.expectToMatchJsResult();
});

test.each([{ length: 0, arrayLength: 0 }, { length: 1, arrayLength: 1 }, { length: 7, arrayLength: 3 }])(
    "Array length set",
    ({ length, arrayLength }) => {
        util.testFunction`
            const array = [1, 2, 3];
            array.length = ${length};
            return array.length;
        `.expectToEqual(arrayLength);
    }
);

test.each([{ length: 0, arrayLength: 0 }, { length: 1, arrayLength: 1 }, { length: 7, arrayLength: 3 }])(
    "Array length set as expression",
    ({ length, arrayLength }) => {
        util.testFunction`
            const array = [1, 2, 3];
            const expressionValue = array.length = ${length};
            return { expressionValue, arrayLength: array.length };
        `.expectToEqual({ expressionValue: length, arrayLength });
    }
);

test.each([-1, -7, 0.1, NaN, Infinity, -Infinity])("Invalid array length set", length => {
    util.testFunction`
        const arr = [1, 2, 3];
        arr.length = ${length};
    `.expectToEqual(new util.ExecutionError(`invalid array length: ${length}`));
});
