## TSTL Benchmarks

These benchmarks are written in typescript and transpiled to lua by using tstl.

### Currently only memory benchmarks are supported

To add a new benchmark add a new file to `memory_benchmarks`
with a exported function with the following type: `() => void`.

And add the function to the `memoryBenchmarkInput` inside `run.ts`.

For example:

```ts
export default myBenchmark() {
    cont n = 123;
    for (let i = 0; i < n; i++) {
        // Do something memory instensive
    }
}
```

```ts
import myBenchmark from "./memory_benchmarks/myBenchmark";

// ...

const memoryBenchmarkInput: (() => void)[] = [
    // ...
    myBenchmark
];
```

**Goal**

The goal of memory benchmarks is to track how much (memory) `"garbage"` is created by tstl.
For that reason garabage collection is disabled in the benchmarks.

You can force the creation of `"garbage"` by creating a lot of anonymous functions or temporary tables (see [lua-users.org](http://lua-users.org/wiki/OptimisingGarbageCollection) for more information).

To avoid crashes in the CI your benchmark should not use more than 500MB of memory.

**Running locally**

`npx typescript-to-lua -p tsconfig.53.json && cd dist && lua -- run.lua ../data/benchmark_master_53.json master`