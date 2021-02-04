import * as util from "../../util";

const initRefsTs = `
    let ref = {};
    let ref2 = () => {};
`;

test("weakMap constructor", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, 1]]);
        return mymap.get(ref);
    `.expectToMatchJsResult();
});

test("weakMap iterable constructor", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, 1], [ref2, 2]]);
        return mymap.has(ref) && mymap.has(ref2);
    `.expectToMatchJsResult();
});

test("weakMap iterable constructor map", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap(new Map([[ref, 1], [ref2, 2]]));
        return mymap.has(ref) && mymap.has(ref2);
    `.expectToMatchJsResult();
});

test("weakMap delete", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, true], [ref2, true]]);
        mymap.delete(ref2);
        return mymap.has(ref) && !mymap.has(ref2);
    `.expectToMatchJsResult();
});

test("weakMap get", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, 1], [{}, 2]]);
        return mymap.get(ref);
    `.expectToMatchJsResult();
});

test("weakMap get missing", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[{}, true]]);
        return mymap.get({});
    `.expectToMatchJsResult();
});

test("weakMap has", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, true]]);
        return mymap.has(ref);
    `.expectToMatchJsResult();
});

test("weakMap has false", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[ref, true]]);
        return mymap.has(ref2);
    `.expectToMatchJsResult();
});

test("weakMap has null", () => {
    util.testFunction`
        ${initRefsTs}
        let mymap = new WeakMap([[{}, true]]);
        return mymap.has(null);
    `.expectToMatchJsResult();
});

test("weakMap set", () => {
    const init = `
        ${initRefsTs}
        let mymap = new WeakMap();
        mymap.set(ref, 5);
    `;

    util.testFunction(init + "return mymap.has(ref);").expectToMatchJsResult();

    util.testFunction(init + "return mymap.get(ref)").expectToMatchJsResult();
});

test("weakMap has no map features (size)", () => {
    util.testExpression("(new WeakMap() as any).size").expectToMatchJsResult();
});

test.each(["clear()", "keys()", "values()", "entries()", "forEach(() => {})"])(
    "weakMap has no map features (%p)",
    call => {
        const testBuilder = util.testFunction(`(new WeakMap() as any).${call}`);
        const luaResult = testBuilder.getLuaExecutionResult();
        expect(luaResult.message).toContain("attempt to call a nil value");
    }
);
