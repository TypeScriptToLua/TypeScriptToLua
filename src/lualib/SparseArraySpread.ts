function __TS__SparseArraySpread(this: void, list: unknown[]) {
    const _unpack = unpack ?? table.unpack;
    return _unpack(list, 1, (list as __TS__SparseArray)["#"]);
}
