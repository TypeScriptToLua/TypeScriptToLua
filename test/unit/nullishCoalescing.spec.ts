import * as util from "../util";

test.each(["null", "undefined"])("nullish-coalesing operator returns rhs", nullishValue => {
    util.testExpression`${nullishValue} ?? "Hello, World!"`
        .ignoreDiagnostics([2871 /* TS2871: This expression is always nullish. */])
        .expectToMatchJsResult();
});

test.each([3, "foo", {}, [], true, false])("nullish-coalesing operator returns lhs", value => {
    util.testExpression`${util.formatCode(value)} ?? "Hello, World!"`
        .ignoreDiagnostics([
            2869 /* TS2869: Right operand of ?? is unreachable because the left operand is never nullish. */,
        ])
        .expectToMatchJsResult();
});

test.each(["any", "unknown"])("nullish-coalesing operator with any/unknown type", type => {
    util.testFunction`
        const unknownType = false as ${type};
        return unknownType ?? "This should not be returned!";
    `
        .ignoreDiagnostics([2871 /* TS2871: This expression is always nullish. */])
        .expectToMatchJsResult();
});

test.each(["boolean | string", "number | false", "undefined | true"])(
    "nullish-coalesing operator with union type",
    unionType => {
        util.testFunction`
            const unknownType = false as ${unionType};
            return unknownType ?? "This should not be returned!";
        `.expectToMatchJsResult();
    }
);

test("nullish-coalescing operator with side effect lhs", () => {
    util.testFunction`
        let i = 0;
        const incI = () => ++i;
        return [i, incI() ?? 3, i];
    `.expectToMatchJsResult();
});

test("nullish-coalescing operator with side effect rhs", () => {
    util.testFunction`
        let i = 0;
        const incI = () => ++i;
        return [i, undefined ?? incI(), i];
    `
        .ignoreDiagnostics([2871 /* TS2871: This expression is always nullish. */])
        .expectToMatchJsResult();
});

test("nullish-coalescing operator with vararg", () => {
    util.testFunction`

        function foo(...args: any[]){
            return args
        }
        function bar(...args: any[]) {
            let x: boolean | undefined = false
            const y = x ?? foo(...args)
        }
        return bar(1, 2)
    `.expectToMatchJsResult();
});

test.each([true, false, null])("nullish-coalescing with generic lhs (%p)", lhs => {
    util.testFunction`
        function coalesce<A, B>(a: A, b: B) {
            return a ?? b
        }
        return coalesce(${lhs}, "wasNull")
    `.expectToMatchJsResult();
});
