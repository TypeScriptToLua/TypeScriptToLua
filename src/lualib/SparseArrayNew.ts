type __TS__SparseArray = unknown[] & { "#": number };

function __TS__SparseArrayNew(this: void, ...args: unknown[]) {
    (args as __TS__SparseArray)["#"] = select("#", ...args);
    return args;
}
