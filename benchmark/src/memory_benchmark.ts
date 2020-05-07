import { BenchmarkKind, MemoryBenchmarkResult, ComparisonInfo } from "./benchmark_types";
import { toFixed, json } from "./util";

export function runMemoryBenchmark(benchmarkFunction: Function): MemoryBenchmarkResult {
    const result: MemoryBenchmarkResult = {
        kind: BenchmarkKind.Memory,
        benchmarkName: "NO_NAME",
        preExecMemoryUsage: 0,
        postExecMemoryUsage: 0,
        memoryUsedForExec: 0,
        memoryAfterGC: 0,
    };

    collectgarbage("stop");
    result.preExecMemoryUsage = collectgarbage("count");

    benchmarkFunction();

    result.postExecMemoryUsage = collectgarbage("count");
    result.memoryUsedForExec = result.postExecMemoryUsage - result.preExecMemoryUsage;

    collectgarbage("restart");
    collectgarbage("collect");

    result.memoryAfterGC = collectgarbage("count");

    result.benchmarkName = debug.getinfo(benchmarkFunction).short_src;

    return result;
}

export function compareMemoryBenchmarks(
    oldResults: MemoryBenchmarkResult[],
    newResults: MemoryBenchmarkResult[]
): ComparisonInfo {
    let comparisonTable = "| name | master (MB) | commit (MB) | change (MB) | change (%) |\n| - | - | - | - | - |\n";

    const formatMemory = (memInKB: number) => toFixed(memInKB / 1024, 3);

    // we group by the new results in case benchmarks have been added
    newResults.forEach(newResult => {
        const oldResult = oldResults.find(r => r.benchmarkName === newResult.benchmarkName);
        if (oldResult) {
            const percentageChange = (newResult.memoryUsedForExec / oldResult.memoryUsedForExec) * 100 - 100;
            comparisonTable += `| ${newResult.benchmarkName} | ${formatMemory(
                oldResult.memoryUsedForExec
            )} | ${formatMemory(newResult.memoryUsedForExec)} | ${formatMemory(
                newResult.memoryUsedForExec - oldResult.memoryUsedForExec
            )} | ${toFixed(percentageChange, 2)} |\n`;
        } else {
            // No master found => new benchmark
            comparisonTable += `| ${newResult.benchmarkName}(new) | / | ${formatMemory(
                newResult.memoryUsedForExec
            )} | /  | / |\n`;
        }
    });

    const summary = `**Memory:**\n${comparisonTable}`;

    const text = `**master:**\n\`\`\`json\n${json.encode(oldResults)}\n\`\`\`\n**commit:**\n\`\`\`json\n${json.encode(
        newResults
    )}\n\`\`\``;

    return { summary, text };
}
