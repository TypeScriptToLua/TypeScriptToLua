import * as util from "../../util";

test.each([{}, { description: 1 }, { description: "name" }])(
    "symbol.toString() (%p)",
    ({ description }) => {
        const result = util.transpileAndExecute(`
    return Symbol(${JSON.stringify(description)}).toString();
`);

        expect(result).toBe(`Symbol(${description || ""})`);
    },
);

test.each([{}, { description: 1 }, { description: "name" }])(
    "symbol.description (%p)",
    ({ description }) => {
        const result = util.transpileAndExecute(`
    return Symbol(${JSON.stringify(description)}).description;
`);

        expect(result).toBe(description);
    },
);

test("symbol uniqueness", () => {
    const result = util.transpileAndExecute(`
        return Symbol("a") === Symbol("a");
    `);

    expect(result).toBe(false);
});

test("Symbol.for", () => {
    const result = util.transpileAndExecute(`
        return Symbol.for("name").description;
    `);

    expect(result).toBe("name");
});

test("Symbol.for non-uniqueness", () => {
    const result = util.transpileAndExecute(`
        return Symbol.for("a") === Symbol.for("a");
    `);

    expect(result).toBe(true);
});

test("Symbol.keyFor", () => {
    const result = util.transpileAndExecute(`
        const sym = Symbol.for("a");
        Symbol.for("b");
        return Symbol.keyFor(sym);
    `);

    expect(result).toBe("a");
});

test("Symbol.keyFor empty", () => {
    const result = util.transpileAndExecute(`
        Symbol.for("a");
        return Symbol.keyFor(Symbol());
    `);

    expect(result).toBe(undefined);
});
