import { __TS__SparseArray } from "./SparseArray";

export function __TS__SparseArraySpread<T>(this: void, sparseArray: __TS__SparseArray<T>): LuaMultiReturn<T[]> {
    return unpack(sparseArray, 1, sparseArray.sparseLength);
}
