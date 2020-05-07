import { runMemoryBenchmark, compareMemoryBenchmarks } from "./memory_benchmark";
import { isMemoryBenchmarkResult, BenchmarkResult, MemoryBenchmarkResult, ComparisonInfo } from "./benchmark_types";
import { json, loadBenchmarksFromDirectory, readFile } from "./util";

// CLI arguments
// arg[0]: output path for benchmark data
// arg[1]: path to baseline benchmark data (required to generate comparison)
// arg[2]: path to result markdown file (optional)
declare const arg: [string | undefined, string | undefined, string | undefined];

function benchmark(): void {
    // Memory tests
    let memoryUpdatedResults: MemoryBenchmarkResult[] = [];

    const loadPreviousMemoryBenchmarksResult = loadBenchmarksFromDirectory("memory_benchmarks");

    if (loadPreviousMemoryBenchmarksResult.isOk()) {
        memoryUpdatedResults = loadPreviousMemoryBenchmarksResult.value.map(runMemoryBenchmark);
    } else {
        print(loadPreviousMemoryBenchmarksResult.error);
        os.exit(1);
    }

    // run future benchmarks types here

    const benchmarkResults = [...memoryUpdatedResults];

    // Try to read the baseline benchmark result
    let previousBenchmarkResults: BenchmarkResult[] = [];
    if (arg[1]) {
        const readPreviousFileResult = readFile(arg[1]);
        if (readPreviousFileResult.isOk()) {
            previousBenchmarkResults = json.decode(readPreviousFileResult.value) as BenchmarkResult[];
        }
    }

    // Compare results
    const comparisonInfo = compareBenchmarks(previousBenchmarkResults, benchmarkResults);

    // Output comparison info
    outputBenchmarkData(comparisonInfo, benchmarkResults);
}
benchmark();

function compareBenchmarks(previousResults: BenchmarkResult[], updatedResults: BenchmarkResult[]): ComparisonInfo {
    const previousResultsMemory = previousResults.filter(isMemoryBenchmarkResult);
    const updatedResultsMemory = updatedResults.filter(isMemoryBenchmarkResult);

    const memoryComparisonInfo = compareMemoryBenchmarks(previousResultsMemory, updatedResultsMemory);

    return { summary: memoryComparisonInfo[0], text: memoryComparisonInfo[1] };
}

function outputBenchmarkData(
    comparisonInfo: { summary: string; text: string },
    updatedResults: BenchmarkResult[]
): void {
    if (!arg[2]) {
        // Output to stdout as json by default, this is used by the CI to retrieve the info
        print(json.encode(comparisonInfo));
    } else {
        // Output to file as markdown if arg[2] is set, this is useful for local development
        const markdownDataFile = io.open(arg[2], "w+")[0]!;
        markdownDataFile.write(comparisonInfo.summary + comparisonInfo.text);
    }
    // Output benchmark results to json
    if (arg[0]) {
        const jsonDataFile = io.open(arg[0], "w+")[0]!;
        jsonDataFile.write(json.encode(updatedResults));
    }
}
