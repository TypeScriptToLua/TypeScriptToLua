export enum BenchmarkKind {
    Memory = "memory",
    Runtime = "runtime",
}

export type BenchmarkFunction = () => void;

export type BenchmarkResult = MemoryBenchmarkResult | RuntimeBenchmarkResult;

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

export interface RuntimeBenchmarkResult {
    kind: BenchmarkKind.Runtime;
    time: number;
    benchmarkName: string;
}

export function isRuntimeBenchmarkResult(result: BenchmarkResult): result is RuntimeBenchmarkResult {
    return result.kind === BenchmarkKind.Runtime;
}

export interface ComparisonInfo {
    summary: string;
    text: string;
}
