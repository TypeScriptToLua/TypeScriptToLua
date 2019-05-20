WeakMap = class WeakMap<K extends object, V> {
    public static [Symbol.species] = WeakMap;
    public [Symbol.toStringTag] = "WeakMap";

     // Type of key is actually K
    private items: { [key: string]: V } = {};

    constructor(entries?: Iterable<readonly [K, V]> | Array<readonly [K, V]>) {
        setmetatable(this.items, { __mode: "k" });
        if (entries === undefined) return;

        const iterable = entries as Iterable<[K, V]>;
        if (iterable[Symbol.iterator]) {
            // Iterate manually because WeakMap is compiled with ES5 which doesn't support Iterables in for...of
            const iterator = iterable[Symbol.iterator]();
            while (true) {
                const result = iterator.next();
                if (result.done) {
                    break;
                }
                const value: [K, V] = result.value; // Ensures index is offset when tuple is accessed
                this.set(value[0], value[1]);
            }
        } else {
            for (const kvp of entries as Array<[K, V]>) {
                this.items[kvp[0] as any] = kvp[1];
            }
        }
    }

    public delete(key: K): boolean {
        const contains = this.has(key);
        this.items[key as any] = undefined;
        return contains;
    }

    public get(key: K): V | undefined {
        return this.items[key as any];
    }

    public has(key: K): boolean {
        return this.items[key as any] !== undefined;
    }

    public set(key: K, value: V): this {
        this.items[key as any] = value;
        return this;
    }
};
