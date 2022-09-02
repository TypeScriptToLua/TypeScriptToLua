/** @noSelfInFile */

export function __TS__CountVarargs<T>(...args: T[]): number {
    // Note that we need vararg optimization for this call.
    return select("#", ...args);
}
