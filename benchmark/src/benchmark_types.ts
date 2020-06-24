export enum BenchmarkKind {
    Memory = "memory",
}

export type BenchmarkFunction = () => void;

export type BenchmarkResult = MemoryBenchmarkResult;

export enum MemoryBenchmarkCategory {
    TotalMemory = "totalMemory",
    Garbage = "garbage",
}

export interface MemoryBenchmarkResult {
    kind: BenchmarkKind.Memory;
    categories: Record<MemoryBenchmarkCategory, number>;
    benchmarkName: string;
}

export function isMemoryBenchmarkResult(result: BenchmarkResult): result is MemoryBenchmarkResult {
    return result.kind === BenchmarkKind.Memory;
}

export interface ComparisonInfo {
    summary: string;
    text: string;
}
