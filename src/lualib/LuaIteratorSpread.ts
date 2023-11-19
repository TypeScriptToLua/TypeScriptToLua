export function __TS__LuaIteratorSpread<TKey, TValue, TState>(
    this: (this: void, state: TState, key: TKey) => LuaMultiReturn<[TKey, TValue]>,
    state: TState,
    firstKey: TKey
): LuaMultiReturn<Array<[TKey, TValue]>> {
    const results = [];
    let [key, value] = this(state, firstKey);
    while (key) {
        results.push([key, value]);
        [key, value] = this(state, key);
    }
    return $multi(...results) as LuaMultiReturn<Array<[TKey, TValue]>>;
}
