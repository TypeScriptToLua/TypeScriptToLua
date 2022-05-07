/** @noSelfInFile */

export function __TS__CountVarargs<T>(...args: T[]): number {
    // In Lua 5.0, the arg table includes trailing nils. In all other
    // versions, we must use select() to count trailing nils.
    return _VERSION === "Lua 5.0" ? args.length : select("#", ...args);
}
