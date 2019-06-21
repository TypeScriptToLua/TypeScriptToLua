import * as util from "../../util";

test.each([
    { initial: { a: 3 }, args: [{}] },
    { initial: {}, args: [{ a: 3 }] },
    { initial: { a: 3 }, args: [{ a: 5 }] },
    { initial: { a: 3 }, args: [{ b: 5 }, { c: 7 }] },
])("Object.assign (%p)", ({ initial, args }) => {
    util.testExpression`Object.assign(${util.valueToString(initial)}, ${util.valuesToString(
        args
    )})`.expectToMatchJsResult();
});

test.each([{}, { abc: 3 }, { abc: 3, def: "xyz" }])("Object.entries (%p)", obj => {
    util.testExpressionTemplate`Object.entries(${obj})`.expectToMatchJsResult();
});

test.each([{}, { abc: 3 }, { abc: 3, def: "xyz" }])("Object.keys (%p)", obj => {
    util.testExpressionTemplate`Object.keys(${obj})`.expectToMatchJsResult();
});

test.each([{}, { abc: "def" }, { abc: 3, def: "xyz" }])("Object.values (%p)", obj => {
    util.testExpressionTemplate`Object.values(${obj})`.expectToMatchJsResult();
});

// TODO: Jest 25: as const
test.each([
    ["[]", {}] as const,
    ['[["a", 1], ["b", 2]]', { a: 1, b: 2 }] as const,
    ['[["a", 1], ["a", 2]]', { a: 2 }] as const,
    ['new Map([["foo", "bar"]])', { foo: "bar" }] as const,
])("Object.fromEntries(%s)", ([entries, expected]) => {
    // TODO: Node 12
    util.testExpression`Object.fromEntries(${entries})`.expectToEqual(expected);
});
