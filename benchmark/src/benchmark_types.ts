export enum BenchmarkKind {
    Memory = "memory",
}

export interface BenchmarkResult {
    kind: BenchmarkKind;
}

export type BenchmarkFunction = () => void;

export interface MemoryBenchmarkResult extends BenchmarkResult {
    kind: BenchmarkKind.Memory;
    benchmarkName: string;
    preExecMemoryUsage: number;
    postExecMemoryUsage: number;
    memoryUsedForExec: number;
    memoryAfterGC: number;
}

export function isMemoryBenchmarkResult(result: BenchmarkResult): result is MemoryBenchmarkResult {
    return result.kind == BenchmarkKind.Memory;
}
