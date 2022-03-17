import { __TS__SparseArray } from "./SparseArray";

export function __TS__SparseArrayNew<T>(this: void, ...args: T[]): __TS__SparseArray<T> {
    const sparseArray = [...args] as __TS__SparseArray<T>;
    // select("#", ...) counts the number of args passed, including nils.
    // Note that we're depending on vararg optimization to occur here.
    sparseArray.sparseLength = select("#", ...args);
    return sparseArray;
}
