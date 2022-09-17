import { __TS__SparseArray } from "./SparseArray";
import { __TS__Unpack } from "./Unpack";

export function __TS__SparseArraySpread<T>(this: void, sparseArray: __TS__SparseArray<T>): LuaMultiReturn<T[]> {
    return __TS__Unpack(sparseArray, 1, sparseArray.sparseLength);
}
