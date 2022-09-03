/** @noSelfInFile */

export function __TS__CountVarargs<T>(...args: T[]): number {
    // select() is not available in Lua 5.0. In this version, the arg table
    // includes trailing nils.
    return args.length;
}
