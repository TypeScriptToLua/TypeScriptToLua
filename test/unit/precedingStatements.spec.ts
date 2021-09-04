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
        "i, inc(), i++",
        "i, ...[1, i++, inc(), 2], i++",
    ];

    test.each(sequenceTests)("array literal ([%p])", sequence => {
        util.testFunction`
            const a = [7, 8, 9];
            let i = 0;
            function inc() { ++i; return i; }
            return [${sequence}];
        `.expectToMatchJsResult();
    });

    test.each(sequenceTests)("function arguments (foo(%p))", sequence => {
        util.testFunction`
            const a = [7, 8, 9];
            let i = 0;
            function inc() { ++i; return i; }
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

    test("template expression", () => {
        util.testFunction`
            let i = 0;
            return \`\${i} - \${i++}\`
        `.expectToMatchJsResult();
    });

    test("tagged template literal", () => {
        util.testFunction`
            function func(strings: TemplateStringsArray, ...expressions: any[]) {
                return { strings: [...strings], raw: strings.raw, expressions };
            }

            let i = 0;
            return func\`hello \${i} \${i++}\`;
        `.expectToMatchJsResult();
    });

    test("binary operators", () => {
        util.testFunction`
            let i = 0;
            return i + i++;
        `.expectToMatchJsResult();
    });

    test("index assignment statement", () => {
        util.testFunction`
            let i = 0;
            const a = [9, 8, 7];
            a[i] = i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("index assignment expression", () => {
        util.testFunction`
            let i = 0;
            const a = [9, 8, 7];
            const x = a[i] = i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("indirect index assignment statement", () => {
        util.testFunction`
            let i = 1;
            const a = [9, 8, 7];
            function foo(x: number) { i += x; return a; }
            foo(i)[i] = i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("indirect index assignment expression", () => {
        util.testFunction`
            let i = 1;
            const a = [9, 8, 7];
            function foo(x: number) { i += x; return a; }
            const x = foo(i)[i] = i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("compound index assignment statement", () => {
        util.testFunction`
            let i = 0;
            const a = [9, 8, 7];
            a[i] += i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("compound index assignment expression", () => {
        util.testFunction`
            let i = 0;
            const a = [9, 8, 7];
            const x = a[i] += i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("compound indirect index assignment statement", () => {
        util.testFunction`
            let i = 1;
            const a = [9, 8, 7];
            function foo(x: number) { i += x; return a; }
            foo(i)[i] += i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("compound indirect index assignment expression", () => {
        util.testFunction`
            let i = 1;
            const a = [9, 8, 7];
            function foo(x: number) { i += x; return a; }
            const x = foo(i)[i] += i++;
            return a;
        `.expectToMatchJsResult();
    });

    test("destructuring assignment statement", () => {
        util.testFunction`
            let i = 0;
            const a = [9, 8, 7];
            [a[i++], a[i]] = [i++, i];
            return a;
        `.expectToMatchJsResult();
    });

    test("destructuring assignment expression", () => {
        util.testFunction`
            let i = 0;
            const a = [9, 8, 7];
            const x = [a[i++], a[i]] = [i++, i];
            return a;
        `.expectToMatchJsResult();
    });

    test("call statement", () => {
        util.testFunction`
            let i = 1;
            const a = [9, 8, 7, 6, 5, 4, 3, 2, 1];
            function foo(x: number) { i += x; return ((y: number) => { i += y; return a; }); }
            foo(i++)(i++)[i] = 0;
            return a;
        `.expectToMatchJsResult();
    });

    test("call expression", () => {
        util.testFunction`
            let i = 1;
            const a = [9, 8, 7, 6, 5, 4, 3, 2, 1];
            function foo(x: number) { i += x; return ((y: number) => { i += y; return a; }); }
            const x = foo(i++)(i++)[i] = 0;
            return a;
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

test("else if", () => {
    util.testFunction`
        let i = 0;
        if (i++ === 0) {
        } else if (i++ === 1) {
        }
        return i;
    `.expectToMatchJsResult();
});
