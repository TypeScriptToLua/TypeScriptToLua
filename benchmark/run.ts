import { runMemoryBenchmark, compareMemoryBenchmarks } from "./memory_benchmark";
import { isMemoryBenchmarkResult, BenchmarkResult } from "./benchmark_types";
import detectCyleBenchmark from "./memory_benchmarks/graph_cylce";
import { json } from "./util";

// CLI arguments
// arg[0]: path to baseline benchmark data (required because this is also the output path)
// arg[1]: branchname (optional)
declare var arg: any[];

function benchmark() {
    // Benchnmarks need to run first since we always want to output a new baseline
    // even if there was no previous one

    // Memory tests
    const memoryBenchmarkInput: (() => void)[] = [
        detectCyleBenchmark
    ];

    const memoryUpdatedResults = memoryBenchmarkInput.map(runMemoryBenchmark);

    // run future benchmarks types here

    const updatedResults = [...memoryUpdatedResults];

    // Try to read the last benchmark result
    const masterContent = loadMasterBenchmarkData();
    if (masterContent) {
        const masterResults = json.decode(masterContent) as BenchmarkResult[];

        const masterResultsMemory = masterResults.filter(isMemoryBenchmarkResult);

        const memoryComparisonInfo = compareMemoryBenchmarks(masterResultsMemory, memoryUpdatedResults);

        const jsonInfo = json.encode({ summary: memoryComparisonInfo[0], text: memoryComparisonInfo[1] });

        // Output benchmark information to stdout
        print(jsonInfo);
    } else {
        // No master yet, just write the current results to disk and output empty info
        print(json.encode({ summary: "new benchmark (no results yet)", text: "" }))
    }

    // Only update baseline if we are on master branch
    if (arg[1] && string.find(arg[1], "master")[0]) {
        const updatedMasterFile = io.open(arg[0], "w+")[0] as LuaFile
        updatedMasterFile.write(json.encode(updatedResults));
    }
}
benchmark();

function loadMasterBenchmarkData(): (string | undefined) {
    const masterFileOpen = io.open(arg[0], "rb");

    if (masterFileOpen && masterFileOpen[0]) {
        const masterFile = masterFileOpen[0];
        let masterContent: (string | undefined)[];
        if (_VERSION == "Lua 5.3") {
            // @ts-ignore
            masterContent = masterFile.read("a");
        }
        else {
            // JIT
            // @ts-ignore
            masterContent = masterFile.read("*a");
        }
        masterFile.close();

        if (masterContent[0]) {
            return masterContent[0];
        }
    }
}

