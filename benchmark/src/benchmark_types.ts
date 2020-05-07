export enum BenchmarkKind {
    Memory = "memory",
}

export type BenchmarkFunction = () => void;

export type BenchmarkResult = MemoryBenchmarkResult;

export interface MemoryBenchmarkResult {
    kind: BenchmarkKind.Memory;
    benchmarkName: string;
    preExecMemoryUsage: number;
    postExecMemoryUsage: number;
    memoryUsedForExec: number;
    memoryAfterGC: number;
}

export function isMemoryBenchmarkResult(result: BenchmarkResult): result is MemoryBenchmarkResult {
    return result.kind === BenchmarkKind.Memory;
}

export interface ComparisonInfo {
    summary: string;
    text: string;
}
