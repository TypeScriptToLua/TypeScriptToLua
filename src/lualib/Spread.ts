export function __TS__Spread<T>(this: void, iterable: string | Iterable<T>): LuaMultiReturn<T[]> {
    const arr: T[] = [];
    if (typeof iterable === "string") {
        for (const i of $range(0, iterable.length - 1)) {
            arr[i] = iterable[i] as T;
        }
    } else {
        let len = 0;
        for (const item of iterable) {
            len++;
            arr[len - 1] = item;
        }
    }
    return $multi(...arr);
}
