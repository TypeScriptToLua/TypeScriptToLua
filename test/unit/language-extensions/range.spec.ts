import * as util from "../../util";
import { invalidRangeControlVariable, invalidRangeUse } from "../../../src/transformation/utils/diagnostics";

test("$range basic use", () => {
    util.testFunction`
        const result: number[] = [];
        for (const i of $range(1, 5)) {
            result.push(i);
        }
        return result;
    `
        .withLanguageExtensions()
        .expectToEqual([1, 2, 3, 4, 5]);
});

test("$range basic use with step", () => {
    util.testFunction`
        const result: number[] = [];
        for (const i of $range(1, 10, 2)) {
            result.push(i);
        }
        return result;
    `
        .withLanguageExtensions()
        .expectToEqual([1, 3, 5, 7, 9]);
});

test("$range basic use reverse", () => {
    util.testFunction`
        const result: number[] = [];
        for (const i of $range(5, 1, -1)) {
            result.push(i);
        }
        return result;
    `
        .withLanguageExtensions()
        .expectToEqual([5, 4, 3, 2, 1]);
});

test("$range invalid control variable", () => {
    util.testFunction`
        let i: number;
        for (i of $range(1, 5)) {}
    `
        .withLanguageExtensions()
        .expectDiagnosticsToMatchSnapshot([invalidRangeControlVariable.code]);
});

test.each([
    "for (const i in $range(1, 10, 2)) {}",
    "const x = $range(1, 10);",
    "const range = $range;",
    "const y = [...$range(1, 10)];",
    "for (const i of ($range(1, 10, 2))) {}",
    "for (const i of $range(1, 10, 2) as number[]) {}",
])("$range invalid use (%p)", statement => {
    util.testFunction`
        ${statement}
    `
        .withLanguageExtensions()
        .expectDiagnosticsToMatchSnapshot([invalidRangeUse.code]);
});
