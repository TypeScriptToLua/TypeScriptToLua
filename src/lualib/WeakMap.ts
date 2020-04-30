WeakMap = class WeakMap<K extends object, V> {
    public static [Symbol.species] = WeakMap;
    public [Symbol.toStringTag] = "WeakMap";

    private items = new LuaTable<K, V>();

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
                this.items.set(value[0], value[1]);
            }
        } else {
            for (const kvp of entries as Array<[K, V]>) {
                this.items.set(kvp[0], kvp[1]);
            }
        }
    }

    public delete(key: K): boolean {
        const contains = this.has(key);
        this.items.set(key, undefined);
        return contains;
    }

    public get(key: K): V | undefined {
        return this.items.get(key);
    }

    public has(key: K): boolean {
        return this.items.get(key) !== undefined;
    }

    public set(key: K, value: V): this {
        this.items.set(key, value);
        return this;
    }
};
