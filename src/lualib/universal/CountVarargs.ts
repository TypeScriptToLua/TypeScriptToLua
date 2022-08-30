/** @noSelfInFile */

export function __TS__CountVarargs<T>(...args: T[]): number {
    // It is important that the select() branch come first as we need vararg
    // optimization for this call.
    return select("#", ...args);
}
