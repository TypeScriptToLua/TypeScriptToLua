declare function setmetatable<T extends object>(obj: T, metatable: any): T;

class WeakMap<TKey extends object, TValue> {
    private items: {[key: string]: TValue}; // Type of key is actually TKey

    constructor(other: Iterable<[TKey, TValue]> | Array<[TKey, TValue]>) {
        this.items = {};
        setmetatable(this.items, { __mode: 'k' });

        if (other) {
            const iterable = other as Iterable<[TKey, TValue]>;
            if (iterable[Symbol.iterator]) {
                // Iterate manually because WeakMap is compiled with ES5 which doesn't support Iterables in for...of
                const iterator = iterable[Symbol.iterator]();
                while (true) {
                    const result = iterator.next();
                    if (result.done) {
                        break;
                    }
                    const value: [TKey, TValue] = result.value; // Ensures index is offset when tuple is accessed
                    this.set(value[0], value[1]);
                }
            } else {
                for (const kvp of other as Array<[TKey, TValue]>) {
                    this.items[kvp[0] as any] = kvp[1];
                }
            }
        }
    }

    public delete(key: TKey): boolean {
        const contains = this.has(key);
        this.items[key as any] = undefined;
        return contains;
    }

    public get(key: TKey): TValue {
        return this.items[key as any];
    }

    public has(key: TKey): boolean {
        return this.items[key as any] !== undefined;
    }

    public set(key: TKey, value: TValue): WeakMap<TKey, TValue> {
        this.items[key as any] = value;
        return this;
    }
}
