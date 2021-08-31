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
});
