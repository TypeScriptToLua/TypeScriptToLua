/** @noSelfInFile */

import { __TS__IsLua50 } from "./IsLua50";

export function __TS__CountVarargs<T>(...args: T[]): number {
    // select() is not available in Lua 5.0. In that version, the arg table
    // includes trailing nils.
    // It is important that the select() branch come first as we need vararg
    // optimization for this call.
    return !__TS__IsLua50 ? select("#", ...args) : args.length;
}
