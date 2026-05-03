// Lua 5.5 replaces a `nil` error object with a string ("<no error object>")
// when an error propagates out of a protected call. This breaks `throw undefined`
// round-tripping through `pcall`. To preserve the original value, we route
// protected calls through `xpcall` with a message handler that wraps nil into
// this sentinel table (Lua 5.5 only mangles nil, not other values), and unwrap
// on the catch side.
// See: https://www.lua.org/manual/5.5/manual.html#8.1
const ____TS__NilErrorObject: any = {};

export function __TS__WrapErrorObject(this: void, value: any): any {
    if (value === undefined) return ____TS__NilErrorObject;
    return value;
}

export function __TS__UnwrapErrorObject(this: void, value: any): any {
    if (value === ____TS__NilErrorObject) return undefined;
    return value;
}
