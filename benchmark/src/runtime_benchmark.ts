import { BenchmarkKind, ComparisonInfo, RuntimeBenchmarkResult } from "./benchmark_types";
import { compareNumericBenchmarks } from "./benchmark_util";
import { json, toFixed } from "./util";

export function runRuntimeBenchmark(benchmarkFunction: () => void): RuntimeBenchmarkResult {
    const result: RuntimeBenchmarkResult = {
        kind: BenchmarkKind.Runtime,
        benchmarkName: "NO_NAME",
        time: 0,
    };

    // normalize times a bit
    collectgarbage("collect");

    const startTime = os.clock();
    benchmarkFunction();
    const time = os.clock() - startTime;

    result.benchmarkName = debug.getinfo(benchmarkFunction).short_src;
    result.time = time;
    return result;
}

export function compareRuntimeBenchmarks(
    oldResults: RuntimeBenchmarkResult[],
    newResults: RuntimeBenchmarkResult[]
): ComparisonInfo {
    const summary =
        "### runtime\n\n" +
        compareNumericBenchmarks(
            newResults,
            oldResults,
            "s",
            result => result.time,
            time => toFixed(time, 4)
        );

    const text = `### master\n\`\`\`json\n${json.encode(oldResults)}\n\`\`\`\n### commit\n\`\`\`json\n${json.encode(
        newResults
    )}\n\`\`\``;

    return { summary, text };
}
