import * as util from "../../util";

const initRefsTs = `
    let ref = {};
    let ref2 = () => {};
`;

test("weakSet constructor", () => {
    util.testFunction`
        ${initRefsTs}
        let myset = new WeakSet([ref]);
        return myset.has(ref)
    `.expectToMatchJsResult();
});

test("weakSet iterable constructor", () => {
    util.testFunction`
        ${initRefsTs}
        let myset = new WeakSet([ref, ref2]);
        return myset.has(ref) && myset.has(ref2);
    `.expectToMatchJsResult();
});

test("weakSet iterable constructor set", () => {
    util.testFunction`
        ${initRefsTs}
        let myset = new WeakSet(new Set([ref, ref2]));
        return myset.has(ref) && myset.has(ref2);
    `.expectToMatchJsResult();
});

test("weakSet add", () => {
    util.testFunction`
        ${initRefsTs}
        let myset = new WeakSet();
        myset.add(ref);
        return myset.has(ref);
    `.expectToMatchJsResult();
});

test("weakSet add different references", () => {
    util.testFunction`
        ${initRefsTs}
        let myset = new WeakSet();
        myset.add({});
        return myset.has({});
    `.expectToMatchJsResult();
});

test("weakSet delete", () => {
    util.testFunction`
        ${initRefsTs}
        let myset = new WeakSet([ref, ref2]);
        myset.delete(ref);
        return myset.has(ref2) && !myset.has(ref);
    `.expectToMatchJsResult();
});

test("weakSet has no set features (size)", () => {
    util.testExpression("(new WeakSet() as any).size").expectToMatchJsResult();
});

test.each(["clear()", "keys()", "values()", "entries()", "forEach(() => {})"])(
    "weakSet has no set features (%p)",
    call => {
        const testBuilder = util.testFunction(`(new WeakSet() as any).${call}`);
        const luaResult = testBuilder.getLuaExecutionResult();
        expect(luaResult.message).toContain("attempt to call a nil value");
    },
);
