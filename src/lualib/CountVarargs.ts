/** @noSelfInFile */

import { __TS__IsLua50 } from "./IsLua50";

export function __TS__CountVarargs<T>(...args: T[]): number {
    // In Lua 5.0, the arg table includes trailing nils. In all other
    // versions, we must use select() to count trailing nils.
    return __TS__IsLua50 ? args.length : select("#", ...args);
}
