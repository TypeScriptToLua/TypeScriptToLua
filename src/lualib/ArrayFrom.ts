/** @noSelfInFile */

import { __TS__Iterator } from "./Iterator";

function arrayLikeStep(this: ArrayLike<unknown>, index: number): LuaMultiReturn<[number, unknown] | []> {
    index += 1;
    if (index > this.length) return $multi();
    return $multi(index, this[index]);
}

const arrayLikeIterator: (
    this: void,
    arr: ArrayLike<unknown> | Iterable<unknown>
) => LuaIterable<LuaMultiReturn<[number, unknown]>> = ((arr: any) => {
    if (typeof arr.length === "number") return $multi(arrayLikeStep, arr, 0);
    return __TS__Iterator(arr);
}) as any;

export function __TS__ArrayFrom(
    this: void,
    arrayLike: ArrayLike<unknown> | Iterable<unknown>,
    mapFn?: (this: unknown, element: unknown, index: number) => unknown,
    thisArg?: unknown
): unknown[] {
    const result = [];
    if (mapFn === undefined) {
        for (const [, v] of arrayLikeIterator(arrayLike)) {
            result.push(v);
        }
    } else {
        let i = 0;
        for (const [, v] of arrayLikeIterator(arrayLike)) {
            result.push(mapFn.call(thisArg, v, i++));
        }
    }
    return result;
}
