Map = class Map<K, V> {
    public static [Symbol.species] = Map;
    public [Symbol.toStringTag] = "Map";

    private items = new LuaTable<K, V>();
    public size = 0;

    // Key-order variables
    private firstKey: K | undefined;
    private lastKey: K | undefined;
    private nextKey = new LuaTable<K, K>();
    private previousKey = new LuaTable<K, K>();

    constructor(entries?: Iterable<readonly [K, V]> | Array<readonly [K, V]>) {
        if (entries === undefined) return;

        const iterable = entries as Iterable<[K, V]>;
        if (iterable[Symbol.iterator]) {
            // Iterate manually because Map is compiled with ES5 which doesn't support Iterables in for...of
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
            const array = entries as Array<[K, V]>;
            for (const kvp of array) {
                this.set(kvp[0], kvp[1]);
            }
        }
    }

    public clear(): void {
        this.items = new LuaTable();
        this.nextKey = new LuaTable();
        this.previousKey = new LuaTable();
        this.firstKey = undefined;
        this.lastKey = undefined;
        this.size = 0;
    }

    public delete(key: K): boolean {
        const contains = this.has(key);
        if (contains) {
            this.size--;

            // Do order bookkeeping
            const next = this.nextKey.get(key);
            const previous = this.previousKey.get(key);
            if (next && previous) {
                this.nextKey.set(previous, next);
                this.previousKey.set(next, previous);
            } else if (next) {
                this.firstKey = next;
                this.previousKey.set(next, undefined);
            } else if (previous) {
                this.lastKey = previous;
                this.nextKey.set(previous, undefined);
            } else {
                this.firstKey = undefined;
                this.lastKey = undefined;
            }

            this.nextKey.set(key, undefined);
            this.previousKey.set(key, undefined);
        }
        this.items.set(key, undefined);

        return contains;
    }

    public forEach(callback: (value: V, key: K, map: Map<K, V>) => any): void {
        for (const key of this.keys()) {
            callback(this.items.get(key), key, this);
        }
    }

    public get(key: K): V | undefined {
        return this.items.get(key);
    }

    public has(key: K): boolean {
        return this.nextKey.get(key) !== undefined || this.lastKey === key;
    }

    public set(key: K, value: V): this {
        const isNewValue = !this.has(key);
        if (isNewValue) {
            this.size++;
        }
        this.items.set(key, value);

        // Do order bookkeeping
        if (this.firstKey === undefined) {
            this.firstKey = key;
            this.lastKey = key;
        } else if (isNewValue) {
            this.nextKey.set(this.lastKey, key);
            this.previousKey.set(key, this.lastKey);
            this.lastKey = key;
        }

        return this;
    }

    public [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    public entries(): IterableIterator<[K, V]> {
        const { items, nextKey } = this;
        let key = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<[K, V]> {
                return this;
            },
            next(): IteratorResult<[K, V]> {
                const result = { done: !key, value: [key, items.get(key)] as [K, V] };
                key = nextKey.get(key);
                return result;
            },
        };
    }

    public keys(): IterableIterator<K> {
        const nextKey = this.nextKey;
        let key = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<K> {
                return this;
            },
            next(): IteratorResult<K> {
                const result = { done: !key, value: key };
                key = nextKey.get(key);
                return result;
            },
        };
    }

    public values(): IterableIterator<V> {
        const { items, nextKey } = this;
        let key = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<V> {
                return this;
            },
            next(): IteratorResult<V> {
                const result = { done: !key, value: items.get(key) };
                key = nextKey.get(key);
                return result;
            },
        };
    }
};
