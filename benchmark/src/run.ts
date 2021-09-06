import { runMemoryBenchmark, compareMemoryBenchmarks } from "./memory_benchmark";
import {
    isMemoryBenchmarkResult,
    BenchmarkResult,
    MemoryBenchmarkResult,
    ComparisonInfo,
    RuntimeBenchmarkResult,
    isRuntimeBenchmarkResult,
} from "./benchmark_types";
import { runRuntimeBenchmark, compareRuntimeBenchmarks } from "./runtime_benchmark";
import { json, loadBenchmarksFromDirectory, readFile } from "./util";

// CLI arguments
// arg[0]: output path for benchmark data
// arg[1]: path to baseline benchmark data (required to generate comparison)
// arg[2]: path to result markdown file (optional)
declare const arg: [string | undefined, string | undefined, string | undefined];

function benchmark(): void {
    // Memory tests

    const memoryBenchmarks = loadBenchmarksFromDirectory("memory_benchmarks");
    const memoryBenchmarkNewResults: MemoryBenchmarkResult[] = memoryBenchmarks.map(runMemoryBenchmark);

    // Run time tests

    const runtimeBenchmarks = loadBenchmarksFromDirectory("runtime_benchmarks");
    const runtimeBenchmarkNewResults: RuntimeBenchmarkResult[] = runtimeBenchmarks.map(runRuntimeBenchmark);

    const newBenchmarkResults = [...memoryBenchmarkNewResults, ...runtimeBenchmarkNewResults];

    // Try to read the baseline benchmark result
    let oldBenchmarkResults: BenchmarkResult[] = [];
    if (arg[1]) {
        const oldBenchmarkData = readFile(arg[1]);
        oldBenchmarkResults = json.decode(oldBenchmarkData) as BenchmarkResult[];
    }

    // Output comparison info
    outputBenchmarkData(oldBenchmarkResults, newBenchmarkResults);
}
benchmark();

function compareBenchmarks(oldResults: BenchmarkResult[], newResults: BenchmarkResult[]): ComparisonInfo {
    const oldResultsMemory = oldResults.filter(isMemoryBenchmarkResult);
    const newResultsMemory = newResults.filter(isMemoryBenchmarkResult);

    const memoryComparisonInfo = compareMemoryBenchmarks(oldResultsMemory, newResultsMemory);

    const oldResultsRuntime = oldResults.filter(isRuntimeBenchmarkResult);
    const newResultsRuntime = newResults.filter(isRuntimeBenchmarkResult);

    const runtimeComparisonInfo = compareRuntimeBenchmarks(oldResultsRuntime, newResultsRuntime);

    return {
        summary: memoryComparisonInfo.summary + "\n" + runtimeComparisonInfo.summary,
        text: memoryComparisonInfo.text + "\n" + runtimeComparisonInfo.text,
    };
}

function outputBenchmarkData(oldResults: BenchmarkResult[], newResults: BenchmarkResult[]): void {
    // Output benchmark results to json
    if (arg[0]) {
        if (arg[1]) {
            // if baseline is provide output full comparison info
            const comparisonInfo = compareBenchmarks(oldResults, newResults);
            const jsonDataFile = io.open(arg[0], "w+")[0]!;
            jsonDataFile.write(json.encode({ old: oldResults, new: newResults, comparison: comparisonInfo }));
        } else {
            const jsonDataFile = io.open(arg[0], "w+")[0]!;
            jsonDataFile.write(json.encode(newResults));
        }
    }
    if (arg[2]) {
        // Output to file as markdown if arg[2] is set, this is useful for local development
        // Compare results
        const comparisonInfo = compareBenchmarks(oldResults, newResults);
        const markdownDataFile = io.open(arg[2], "w+")[0]!;
        markdownDataFile.write(comparisonInfo.summary + comparisonInfo.text);
    }
}
