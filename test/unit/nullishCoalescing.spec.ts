import * as util from "../util";

test.each(["null", "undefined"])("nullish-coalesing operator returns rhs", nullishValue => {
    util.testExpression`${nullishValue} ?? "Hello, World!"`.debug().expectToMatchJsResult();
});

test.each([3, "foo", {}, [], true, false])("nullish-coalesing operator returns lhs", value => {
    util.testExpression`${util.formatCode(value)} ?? "Hello, World!"`.debug().expectToMatchJsResult();
});

test.each(["any", "unknown"])("nullish-coalesing operator with any/unknown type", type => {
    util.testFunction`
        const unknownType = false as ${type};
        return unknownType ?? "This should not be returned!";
    `.expectToMatchJsResult();
});

test.each(["boolean | string", "number | false", "undefined | true"])(
    "nullish-coalesing operator with union type",
    unionType => {
        util.testFunction`
            const unknownType = false as ${unionType};
            return unknownType ?? "This should not be returned!";
        `
            .debug()
            .expectToMatchJsResult();
    }
);
