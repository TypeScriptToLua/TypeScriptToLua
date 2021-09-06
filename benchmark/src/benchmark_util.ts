import { BenchmarkResult } from "./benchmark_types";
import { calculatePercentageChange, toFixed } from "./util";

export const makeMarkdownTableRow = (cells: string[]) => `| ${cells.join(" | ")} |\n`;
export const makeBold = (input: string) => `**${input}**`;

export function compareNumericBenchmarks<T extends BenchmarkResult>(
    newResults: T[],
    oldResults: T[],
    unit: string,
    extractValue: (result: T) => number,
    formatValue: (value: number) => string
): string {
    let comparisonTable = makeMarkdownTableRow([
        "name",
        `master (${unit})`,
        `commit (${unit})`,
        `change (${unit})`,
        "change (%)",
    ]);
    comparisonTable += makeMarkdownTableRow(["---", "---", "---", "---", "---"]);

    let oldValueSum = 0;
    let newValueSum = 0;

    newResults.forEach(newResult => {
        const oldResult = oldResults.find(r => r.benchmarkName === newResult.benchmarkName);
        const newValue = extractValue(newResult);
        if (oldResult) {
            const oldValue = extractValue(oldResult);
            const percentageChange = calculatePercentageChange(oldValue, newValue);
            const change = newValue - oldValue;
            const row = [
                newResult.benchmarkName,
                formatValue(oldValue),
                formatValue(newValue),
                formatValue(change),
                toFixed(percentageChange, 2),
            ];
            comparisonTable += makeMarkdownTableRow(row);
            oldValueSum += oldValue;
            newValueSum += newValue;
        } else {
            // No master found => new benchmark
            const row = [newResult.benchmarkName, formatValue(newValue), "/", "/", "/"];
            comparisonTable += makeMarkdownTableRow(row);
        }
    });

    const sumPercentageChange = calculatePercentageChange(oldValueSum, newValueSum);
    comparisonTable += makeMarkdownTableRow([
        makeBold("sum"),
        makeBold(formatValue(oldValueSum)),
        makeBold(formatValue(newValueSum)),
        makeBold(formatValue(newValueSum - oldValueSum)),
        makeBold(toFixed(sumPercentageChange, 2)),
    ]);

    return comparisonTable;
}
