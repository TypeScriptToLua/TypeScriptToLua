import * as util from "../util";

test.each([
    "NaN === NaN",
    "NaN !== NaN",
    "NaN + NaN",
    "NaN - NaN",
    "NaN * NaN",
    "NaN / NaN",
    "NaN + 1",
    "1 + NaN",
    "1 / NaN",
    "NaN * 0",
])("%s", code => expect(util.transpileAndExecute(`return ${code}`)).toBe(eval(code)));

test("NaN reassignment", () => {
    const result = util.transpileAndExecute(`const NaN = 1; return NaN`);

    expect(result).toBe(NaN);
});

test.each([
    "Infinity",
    "Infinity - Infinity",
    "Infinity / -1",
    "Infinity * -1",
    "Infinity + 1",
    "Infinity - 1",
])("%s", code => expect(util.transpileAndExecute(`return ${code}`)).toBe(eval(code)));

test("Infinity reassignment", () => {
    const result = util.transpileAndExecute(`const Infinity = 1; return Infinity`);

    expect(result).toBe(Infinity);
});

const numberCases = [-1, 0, 1, 1.5, Infinity, -Infinity];
const stringCases = ["-1", "0", "1", "1.5", "Infinity", "-Infinity"];
const restCases: any[] = [true, false, "", " ", "\t", "\n", "foo", {}];
const cases: any[] = [...numberCases, ...stringCases, ...restCases];

describe("Number", () => {
    test.each(cases)("constructor(%p)", value => {
        const result = util.transpileAndExecute(`return Number(${util.valueToString(value)})`);
        expect(result).toBe(Number(value));
    });

    test.each(cases)("isNaN(%p)", value => {
        const result = util.transpileAndExecute(`
            return Number.isNaN(${util.valueToString(value)} as any)
        `);

        expect(result).toBe(Number.isNaN(value));
    });

    test.each(cases)("isFinite(%p)", value => {
        const result = util.transpileAndExecute(`
            return Number.isFinite(${util.valueToString(value)} as any)
        `);

        expect(result).toBe(Number.isFinite(value));
    });
});

test.each(cases)("isNaN(%p)", value => {
    const result = util.transpileAndExecute(`return isNaN(${util.valueToString(value)} as any)`);
    expect(result).toBe(isNaN(value));
});

test.each(cases)("isFinite(%p)", value => {
    const result = util.transpileAndExecute(`return isFinite(${util.valueToString(value)} as any)`);
    expect(result).toBe(isFinite(value));
});
