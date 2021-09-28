function __TS__SparseArrayPush(this: void, list: unknown[], ...args: unknown[]) {
    const argsLen = select("#", ...args);
    const listLen = (list as __TS__SparseArray)["#"];
    for (const i of $range(1, argsLen)) {
        list[listLen + i - 1] = args[i - 1];
    }
    (list as __TS__SparseArray)["#"] = listLen + argsLen;
}
