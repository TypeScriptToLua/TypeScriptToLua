## TSTL Benchmarks

These benchmarks are written in typescript and transpiled to lua by using tstl.

### Currently only memory benchmarks are supported

To add a new benchmark add a new file to `memory_benchmarks`
and **default** export a function with the following type: `() => void`.

For example (memory_benchmarks/my_benchmark.ts):

```ts
export default myBenchmark() {
    const n = 123;
    for (let i = 0; i < n; i++) {
        // Do something memory instensive
    }
}
```

**Goal**

The goal of memory benchmarks is to track how much (memory) `"garbage"` is created by tstl.
For that reason garabage collection is disabled in the benchmarks.

You can force the creation of `"garbage"` by creating a lot of anonymous functions or temporary tables (see [lua-users.org](http://lua-users.org/wiki/OptimisingGarbageCollection) for more information).

To avoid crashes in the CI your benchmark should not use more than 500MB of memory.

**Running locally**

1. Create a benchmark baseline called "benchmark_baseilne.json":  
   `tstl -p tsconfig.53.json && cd dist && lua -- run.lua benchmark_baseilne.json`
2. Make some changes to tstl.
3. Create an updated benchmark and compare with the baseline:  
   `tstl -p tsconfig.53.json && cd dist && lua -- run.lua benchmark_updated.json benchmark_baseilne.json`
4. The above command will output comparison data as json to stdout.
   If you provide a path as third argument the comparison data will be written to that path instead.  
   `tstl -p tsconfig.53.json && cd dist && lua -- run.lua benchmark_updated.json benchmark_baseilne.json result.md`
