import * as ts from "typescript";
import { InvalidForRangeCall } from "../../../src/transformation/utils/errors";
import * as util from "../../util";

test.each([
    { args: [1, 10], expectResult: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { args: [1, 10, 2], expectResult: [1, 3, 5, 7, 9] },
    { args: [10, 1, -1], expectResult: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { args: [10, 1, -2], expectResult: [10, 8, 6, 4, 2] },
])("@forRange loop", ({ args, expectResult }) => {
    const tsHeader = "/** @forRange **/ declare function luaRange(i: number, j: number, k?: number): number[];";
    const code = `
        const results: number[] = [];
        for (const i of luaRange(${args})) {
            results.push(i);
        }
        return JSONStringify(results);`;

    const result = util.transpileAndExecute(code, undefined, undefined, tsHeader);
    expect(JSON.parse(result)).toEqual(expectResult);
});

test("invalid non-ambient @forRange function", () => {
    const code = `
        /** @forRange **/ function luaRange(i: number, j: number, k?: number): number[] { return []; }
        for (const i of luaRange(1, 10, 2)) {}`;

    expect(() => util.transpileString(code)).toThrow(
        InvalidForRangeCall(
            ts.createEmptyStatement(),
            "@forRange function can only be used as an iterable in a for...of loop."
        ).message
    );
});

test.each([[1], [1, 2, 3, 4]])("invalid @forRange argument count", args => {
    const code = `
        /** @forRange **/ declare function luaRange(...args: number[]): number[] { return []; }
        for (const i of luaRange(${args})) {}`;

    expect(() => util.transpileString(code)).toThrow(
        InvalidForRangeCall(ts.createEmptyStatement(), "@forRange function must take 2 or 3 arguments.").message
    );
});

test("invalid @forRange control variable", () => {
    const code = `
        /** @forRange **/ declare function luaRange(i: number, j: number, k?: number): number[];
        let i: number;
        for (i of luaRange(1, 10, 2)) {}`;

    expect(() => util.transpileString(code)).toThrow(
        InvalidForRangeCall(ts.createEmptyStatement(), "@forRange loop must declare its own control variable.").message
    );
});

test("invalid @forRange argument type", () => {
    const code = `
        /** @forRange **/ declare function luaRange(i: string, j: number): number[] { return []; }
        for (const i of luaRange("foo", 2)) {}`;

    expect(() => util.transpileString(code)).toThrow(
        InvalidForRangeCall(ts.createEmptyStatement(), "@forRange arguments must be number types.").message
    );
});

test("invalid @forRange destructuring", () => {
    const code = `
        /** @forRange **/ declare function luaRange(i: number, j: number, k?: number): number[][];
        for (const [i] of luaRange(1, 10, 2)) {}`;

    expect(() => util.transpileString(code)).toThrow(
        InvalidForRangeCall(ts.createEmptyStatement(), "@forRange loop cannot use destructuring.").message
    );
});

test("invalid @forRange return type", () => {
    const code = `
        /** @forRange **/ declare function luaRange(i: number, j: number, k?: number): string[];
        for (const i of luaRange(1, 10)) {}`;

    expect(() => util.transpileString(code)).toThrow(
        InvalidForRangeCall(
            ts.createEmptyStatement(),
            "@forRange function must return Iterable<number> or Array<number>."
        ).message
    );
});

test.each([
    "const range = luaRange(1, 10);",
    "console.log(luaRange);",
    "luaRange.call(null, 0, 0, 0);",
    "let array = [0, luaRange, 1];",
    "const call: any; call(luaRange);",
    "for (const i of [...luaRange(1, 10)]) {}",
])("invalid @forRange reference (%p)", statement => {
    const code = `
        /** @forRange **/ declare function luaRange(i: number, j: number, k?: number): number[];
        ${statement}`;

    expect(() => util.transpileString(code)).toThrow(
        InvalidForRangeCall(
            ts.createEmptyStatement(),
            "@forRange function can only be used as an iterable in a for...of loop."
        ).message
    );
});
