import * as util from "../util";

test.each([
    { operator: "&&", testValue: true },
    { operator: "&&", testValue: false },
    { operator: "&&", testValue: null },
    { operator: "&&=", testValue: true },
    { operator: "&&=", testValue: false },
    { operator: "&&=", testValue: null },
    { operator: "||", testValue: true },
    { operator: "||", testValue: false },
    { operator: "||", testValue: null },
    { operator: "||=", testValue: true },
    { operator: "||=", testValue: false },
    { operator: "||=", testValue: null },
    { operator: "??", testValue: true },
    { operator: "??", testValue: false },
    { operator: "??", testValue: null },
    { operator: "??=", testValue: true },
    { operator: "??=", testValue: false },
    { operator: "??=", testValue: null },
])("short circuit operator (%p)", ({ operator, testValue }) => {
    util.testFunction`
        let x: unknown = ${testValue};
        let y = 1;
        const z = x ${operator} y++;
        return {x, y, z};
    `.expectToMatchJsResult();
});

test.each([true, false])("ternary operator (%p)", condition => {
    util.testFunction`
        let a = 0, b = 0;
        let condition: boolean = ${condition};
        const c = condition ? a++ : b++;
        return [a, b, c];
    `.expectToMatchJsResult();
});

describe("execution order", () => {
    const sequenceTests = [
        "i++, i",
        "i, i++, i, i++",
        "...a",
        "i, ...a",
        "...a, i",
        "i, ...a, i++, i, ...a",
        "i, ...a, i++, i, ...a, i",
        "...[1, i++, 2]",
        "...[1, i++, 2], i++",
        "i, ...[1, i++, 2]",
        "i, ...[1, i++, 2], i",
        "i, ...[1, i++, 2], i++",
        "i, ...[1, i++, 2], i++, ...[3, i++, 4]",
        "i, ...a, i++, ...[1, i++, 2], i, i++, ...a",
    ];

    test.each(sequenceTests)("array literal ([%p])", sequence => {
        util.testFunction`
            const a = [7, 8, 9];
            let i = 0;
            return [${sequence}];
        `.expectToMatchJsResult();
    });

    test.each(sequenceTests)("function arguments (foo(%p))", sequence => {
        util.testFunction`
            const a = [7, 8, 9];
            let i = 0;
            function foo(...args: unknown[]) { return args; }
            return foo(${sequence});
        `.expectToMatchJsResult();
    });

    test.each([
        "{a: i, b: i++}",
        "{a: i, b: i++, c: i}",
        "{a: i, ...{b: i++}, c: i}",
        "{a: i, ...o, b: i++}",
        "{a: i, ...[i], b: i++}",
        "{a: i, ...[i++], b: i++}",
        "{a: i, ...o, b: i++, ...[i], ...{c: i++}, d: i++}",
    ])("object literal (%p)", literal => {
        util.testFunction`
            const o = {a: "A", b: "B", c: "C"};
            let i = 0;
            const literal = ${literal};
            const result: Record<string, unknown> = {};
            (Object.keys(result) as Array<number | string>).forEach(
                key => { result[key.toString()] = literal[key]; }
            );
            return result;
        `.expectToMatchJsResult();
    });

    test("comma operator", () => {
        util.testFunction`
            let a = 0, b = 0, c = 0;
            const d = (a++, b += a, c += b);
            return [a, b, c, d];
        `.expectToMatchJsResult();
    });
});

describe("loop expressions", () => {
    test("while loop", () => {
        util.testFunction`
            let i = 0, j = 0;
            while (i++ < 5) {
                ++j;
                if (j >= 10) {
                    break;
                }
            }
            return i;
        `.expectToMatchJsResult();
    });

    test("for loop", () => {
        util.testFunction`
            let i: number, j: number;
            for (i = 0, j = 0; i++ < 5 && j < 10; ++j) {}
            return i;
        `.expectToMatchJsResult();
    });

    test("do while loop", () => {
        util.testFunction`
            let i = 0, j = 0;
            do {
                ++j;
                if (j >= 10) {
                    break;
                }
            } while (i++ < 5);
            return i;
        `.expectToMatchJsResult();
    });

    test("do while loop scoping", () => {
        util.testFunction`
            let x = 0;
            let result = 0;
            do {
                let x = -10;
                ++result;
            } while (x++ >= 0 && result < 2);
            return result;
        `.expectToMatchJsResult();
    });
});

test("switch scoping", () => {
    util.testFunction`
        let i = 0;
        let x = 0;
        switch (x) {
            case i++:
                return i;
            case i++:
        }
    `.expectToMatchJsResult();
});
