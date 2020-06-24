import { BenchmarkKind, MemoryBenchmarkResult, ComparisonInfo, MemoryBenchmarkCategory } from "./benchmark_types";
import { toFixed, json, calculatePercentageChange } from "./util";

export function runMemoryBenchmark(benchmarkFunction: Function): MemoryBenchmarkResult {
    const result: MemoryBenchmarkResult = {
        kind: BenchmarkKind.Memory,
        benchmarkName: "NO_NAME",
        categories: {
            [MemoryBenchmarkCategory.Garbage]: 0,
            [MemoryBenchmarkCategory.TotalMemory]: 0,
        },
    };

    // collect before running benchmark
    collectgarbage("collect");

    // stop automatic gc
    collectgarbage("stop");

    const preExecMemoryUsage = collectgarbage("count");

    // store return value this allows benchmark functions
    // to prevent "useful" result data from being garbage collected
    let temp = benchmarkFunction();

    const postExecMemoryUsage = collectgarbage("count");

    collectgarbage("restart");
    collectgarbage("collect");

    // get the amount of garbage collected
    result.categories[MemoryBenchmarkCategory.Garbage] = postExecMemoryUsage - collectgarbage("count");

    // make sure result isn't garbage collected until now and supress unused var warning
    temp = temp;

    result.benchmarkName = debug.getinfo(benchmarkFunction).short_src;

    result.categories[MemoryBenchmarkCategory.TotalMemory] = postExecMemoryUsage - preExecMemoryUsage;

    return result;
}

const formatMemory = (memInKB: number) => toFixed(memInKB / 1024, 3);
const makeMarkdownTableRow = (cells: string[]) => `| ${cells.join(" | ")} |\n`;
const makeBold = (input: string) => `**${input}**`;

export function compareMemoryBenchmarks(
    oldResults: MemoryBenchmarkResult[],
    newResults: MemoryBenchmarkResult[]
): ComparisonInfo {
    // Can not use Object.values because we want a fixed order.
    const categories = [MemoryBenchmarkCategory.TotalMemory, MemoryBenchmarkCategory.Garbage];

    const summary = categories
        .map(category => `${makeBold(category)}\n${compareCategory(newResults, oldResults, category)}`)
        .join("\n");

    const text = `**master:**\n\`\`\`json\n${json.encode(oldResults)}\n\`\`\`\n**commit:**\n\`\`\`json\n${json.encode(
        newResults
    )}\n\`\`\``;

    return { summary, text };
}

function compareCategory(
    newResults: MemoryBenchmarkResult[],
    oldResults: MemoryBenchmarkResult[],
    category: MemoryBenchmarkCategory
): string {
    let comparisonTable = makeMarkdownTableRow(["name", "master (mb)", "commit (mb)", "change (mb)", "change (%)"]);
    comparisonTable += makeMarkdownTableRow(["-", "-", "-", "-", "-"]);

    let oldValueSum = 0;
    let newValueSum = 0;

    newResults.forEach(newResult => {
        const oldResult = oldResults.find(r => r.benchmarkName === newResult.benchmarkName);
        if (oldResult) {
            const oldValue = oldResult.categories[category];
            const newValue = newResult.categories[category];
            const percentageChange = calculatePercentageChange(
                newResult.categories[category],
                oldResult.categories[category]
            );
            const change = newResult.categories[category] - oldResult.categories[category];
            const row = [
                newResult.benchmarkName,
                formatMemory(oldValue),
                formatMemory(newValue),
                formatMemory(change),
                toFixed(percentageChange, 2),
            ];
            comparisonTable += makeMarkdownTableRow(row);
            oldValueSum += oldValue;
            newValueSum += newValue;
        } else {
            // No master found => new benchmark
            const row = [newResult.benchmarkName, formatMemory(newResult.categories[category]), "/", "/", "/"];
            comparisonTable += makeMarkdownTableRow(row);
        }
    });

    const sumPercentageChange = calculatePercentageChange(oldValueSum, newValueSum);
    comparisonTable += makeMarkdownTableRow([
        makeBold("sum"),
        makeBold(formatMemory(oldValueSum)),
        makeBold(formatMemory(newValueSum)),
        makeBold(formatMemory(newValueSum - oldValueSum)),
        makeBold(toFixed(sumPercentageChange, 2)),
    ]);

    return comparisonTable;
}
