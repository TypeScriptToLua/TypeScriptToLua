/** @noSelfInFile */

// We're not interested in emulating all of the behaviors of unpack() from Lua
// 5.1, just the ones needed by other parts of lualib.
export function __TS__Unpack<T>(list: T[], i: number, j?: number): LuaMultiReturn<T[]> {
    if (i === 1 && j === undefined) {
        return unpack(list);
    } else {
        j ??= list.length;
        const slice: T[] = [];
        for (let n = i; n <= j; n++) {
            slice[n - i] = list[n - 1]; // We don't want to add 1 to the index into list.
        }
        return $multi(...slice);
    }
}
