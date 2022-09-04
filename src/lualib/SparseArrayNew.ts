import { __TS__CountVarargs } from "./CountVarargs";
import { __TS__SparseArray } from "./SparseArray";

export function __TS__SparseArrayNew<T>(this: void, ...args: T[]): __TS__SparseArray<T> {
    const sparseArray = [...args] as __TS__SparseArray<T>;
    // Note that we're depending on vararg optimization to occur here.
    sparseArray.sparseLength = __TS__CountVarargs(...args);
    return sparseArray;
}
