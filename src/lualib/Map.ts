Map = class Map<K, V> {
    public static [Symbol.species] = Map;
    public [Symbol.toStringTag] = "Map";

    // Type of key is actually K
    private items: { [key: string]: V } = {};
    public size = 0;

    // Key-order variables
    private firstKey: K | undefined;
    private lastKey: K | undefined;
    private nextKey: { [key: string]: K | undefined } = {};
    private previousKey: { [key: string]: K | undefined } = {};

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
        this.items = {};
        this.nextKey = {};
        this.previousKey = {};
        this.size = 0;
        return;
    }

    public delete(key: K): boolean {
        const contains = this.has(key);
        if (contains) {
            this.size--;

            // Do order bookkeeping
            const next = this.nextKey[key as any];
            const previous = this.previousKey[key as any];
            if (next && previous) {
                this.nextKey[previous as any] = next;
                this.previousKey[next as any] = previous;
            } else if (next) {
                this.firstKey = next;
                this.previousKey[next as any] = undefined;
            } else if (previous) {
                this.lastKey = previous;
                this.nextKey[previous as any] = undefined;
            }

            this.nextKey[key as any] = undefined;
            this.previousKey[key as any] = undefined;
        }
        this.items[key as any] = undefined;

        return contains;
    }

    public forEach(callback: (value: V, key: K, map: Map<K, V>) => any): void {
        for (const key of this.keys()) {
            callback(this.items[key as any], key, this);
        }
        return;
    }

    public get(key: K): V | undefined {
        return this.items[key as any];
    }

    public has(key: K): boolean {
        return this.items[key as any] !== undefined;
    }

    public set(key: K, value: V): this {
        const isNewValue = !this.has(key);
        if (isNewValue) {
            this.size++;
        }
        this.items[key as any] = value;

        // Do order bookkeeping
        if (this.firstKey === undefined) {
            this.firstKey = key;
            this.lastKey = key;
        } else if (isNewValue) {
            this.nextKey[this.lastKey as any] = key;
            this.previousKey[key as any] = this.lastKey;
            this.lastKey = key;
        }

        return this;
    }

    public [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    public entries(): IterableIterator<[K, V]> {
        const items = this.items;
        const nextKey = this.nextKey;
        let key = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<[K, V]> {
                return this;
            },
            next(): IteratorResult<[K, V]> {
                const result = { done: !key, value: [key, items[key as any]] as [K, V] };
                key = nextKey[key as any];
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
                key = nextKey[key as any];
                return result;
            },
        };
    }

    public values(): IterableIterator<V> {
        const items = this.items;
        const nextKey = this.nextKey;
        let key = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<V> {
                return this;
            },
            next(): IteratorResult<V> {
                const result = { done: !key, value: items[key as any] };
                key = nextKey[key as any];
                return result;
            },
        };
    }
};
