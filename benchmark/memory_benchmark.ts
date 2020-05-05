import { BenchmarkKind, MemoryBenchmarkResult } from "./benchmark_types";
import { round, json } from "./util";


export function runMemoryBenchmark(benchmarkFunction: Function): MemoryBenchmarkResult {
    let result: MemoryBenchmarkResult = { kind: BenchmarkKind.Memory, benchmarkName: "NO_NAME", preExecMemoryUsage: 0, postExecMemoryUsage: 0, memoryUsedForExec: 0, memoryAfterGC: 0 };

    collectgarbage('stop')
    result.preExecMemoryUsage = collectgarbage("count");

    benchmarkFunction();

    result.postExecMemoryUsage = collectgarbage("count");
    result.memoryUsedForExec = result.postExecMemoryUsage - result.preExecMemoryUsage;

    collectgarbage("restart")
    collectgarbage("collect")

    result.memoryAfterGC = collectgarbage("count");

    result.benchmarkName = debug.getinfo(benchmarkFunction).short_src;

    return result;
}

export function compareMemoryBenchmarks(oldResults: MemoryBenchmarkResult[], updatedResults: MemoryBenchmarkResult[]): [string, string] {
    let comparisonTable = "| name | master (kb) | commit (kb) | change (kb) | change (%) |\n| - | - | - | - | - |\n";

    // we group by the new results in case benchmarks have been added
    updatedResults.forEach(newResult => {
        const masterResult = oldResults.find(r => r.benchmarkName == newResult.benchmarkName);
        if (masterResult) {
            const percentageChange = newResult.memoryUsedForExec / masterResult.memoryUsedForExec * 100 - 100;
            comparisonTable += `| ${newResult.benchmarkName} | ${round(masterResult.memoryUsedForExec, 3)} | ${round(newResult.memoryUsedForExec, 3)} | ${round(newResult.memoryUsedForExec - masterResult.memoryUsedForExec, 3)} | ${round(percentageChange, 2)} |\n`;
        } else {
            // No master found => new benchmark
            comparisonTable += `| ${newResult.benchmarkName}(new) | / | ${round(newResult.memoryUsedForExec, 3)} | /  | / |\n`;
        }
    });

    const markdownSummary = `**Memory:**\n${comparisonTable}`;

    const markdownText =
        `**master:**\n${json.encode(oldResults)}\n**commit:**\n${json.encode(updatedResults)}`;

    return [markdownSummary, markdownText]
}