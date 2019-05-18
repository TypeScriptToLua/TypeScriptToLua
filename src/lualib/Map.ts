Map = class Map<K, V> {
    public static [Symbol.species] = Map;
    public [Symbol.toStringTag] = "Map";

    // Type of key is actually K
    private items: { [key: string]: V } = {};
    public size = 0;

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
            this.size = array.length;
            for (const kvp of array) {
                this.items[kvp[0] as any] = kvp[1];
            }
        }
    }

    public clear(): void {
        this.items = {};
        this.size = 0;
        return;
    }

    public delete(key: K): boolean {
        const contains = this.has(key);
        if (contains) {
            this.size--;
        }
        this.items[key as any] = undefined;
        return contains;
    }

    public forEach(callback: (value: V, key: K, map: Map<K, V>) => any): void {
        for (const key in this.items) {
            callback(this.items[key], key as any, this);
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
        if (!this.has(key)) {
            this.size++;
        }
        this.items[key as any] = value;
        return this;
    }

    public [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    public entries(): IterableIterator<[K, V]> {
        const items = this.items;
        let key: K;
        let value: V;
        return {
            [Symbol.iterator](): IterableIterator<[K, V]> {
                return this;
            },
            next(): IteratorResult<[K, V]> {
                [key, value] = next(items, key);
                return { done: !key, value: [key, value] };
            },
        };
    }

    public keys(): IterableIterator<K> {
        const items = this.items;
        let key: K;
        return {
            [Symbol.iterator](): IterableIterator<K> {
                return this;
            },
            next(): IteratorResult<K> {
                [key] = next(items, key);
                return { done: !key, value: key };
            },
        };
    }

    public values(): IterableIterator<V> {
        const items = this.items;
        let key: K;
        let value: V;
        return {
            [Symbol.iterator](): IterableIterator<V> {
                return this;
            },
            next(): IteratorResult<V> {
                [key, value] = next(items, key);
                return { done: !key, value };
            },
        };
    }
};
