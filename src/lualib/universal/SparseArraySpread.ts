import { __TS__SparseArray } from "./SparseArray";

export function __TS__SparseArraySpread<T>(this: void, sparseArray: __TS__SparseArray<T>): LuaMultiReturn<T[]> {
    const _unpack = unpack ?? table.unpack;
    return _unpack(sparseArray, 1, sparseArray.sparseLength);
}
