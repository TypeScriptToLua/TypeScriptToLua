import { runMemoryBenchmark, compareMemoryBenchmarks } from "./memory_benchmark";
import { isMemoryBenchmarkResult, BenchmarkResult } from "./benchmark_types";
import { json, readAll, readDir, loadBenchmarksFromDirectory, readFile } from "./util";

// CLI arguments
// arg[0]: output path for benchmark data
// arg[1]: path to baseline benchmark data (required to generate comparison)
// arg[2]: path to result markdown file (optional)
declare const arg: [string | undefined, string | undefined, string | undefined];

function benchmark() {
    // Memory tests
    const memoryBenchmarkInput = loadBenchmarksFromDirectory("memory_benchmarks");
    const memoryUpdatedResults = memoryBenchmarkInput.map(runMemoryBenchmark);

    // run future benchmarks types here

    const updatedResults = [...memoryUpdatedResults];

    // Try to read the baseline benchmark result
    let previousResults: BenchmarkResult[] = [];
    const inputContent = arg[1] && readFile(arg[1]);
    if (inputContent) {
        previousResults = json.decode(inputContent) as BenchmarkResult[];
    }

    // Compare results
    const comparisonInfo = compareResults(previousResults, updatedResults);

    // Output comparison info
    outputResults(comparisonInfo, updatedResults);
}
benchmark();

function compareResults(previousResults: BenchmarkResult[], updatedResults: BenchmarkResult[]) {
    const previousResultsMemory = previousResults.filter(isMemoryBenchmarkResult);
    const updatedResultsMemory = updatedResults.filter(isMemoryBenchmarkResult);

    const memoryComparisonInfo = compareMemoryBenchmarks(previousResultsMemory, updatedResultsMemory);

    return { summary: memoryComparisonInfo[0], text: memoryComparisonInfo[1] };
}

function outputResults(comparisonInfo: { summary: string; text: string }, updatedResults: BenchmarkResult[]) {
    if (!arg[2]) {
        // Output to stdout as json by default, this is used by the CI to retrieve the info
        print(json.encode(comparisonInfo));
    } else {
        // Output to file as markdown if arg[2] is set, this is useful for local development
        const updatedResultsFile = io.open(arg[2], "w+")[0] as LuaFile;
        updatedResultsFile.write(comparisonInfo.summary + comparisonInfo.text);
    }
    // Output benchmark results to json
    if (arg[0]) {
        const updatedResultsFile = io.open(arg[0], "w+")[0] as LuaFile;
        updatedResultsFile.write(json.encode(updatedResults));
    }
}
