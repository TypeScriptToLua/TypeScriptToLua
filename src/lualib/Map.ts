/** @tupleReturn */
declare function next<TKey, TValue>(t: { [k: string]: TValue }, index?: TKey): [TKey, TValue];

class Map<TKey, TValue> {
    public size: number;

    private items: {[key: string]: TValue}; // Type of key is actually TKey

    constructor(other: Iterable<[TKey, TValue]> | Array<[TKey, TValue]>) {
        this.items = {};
        this.size = 0;

        if (other) {
            const iterable = other as Iterable<[TKey, TValue]>;
            if (iterable[Symbol.iterator]) {
                // Iterate manually because Map is compiled with ES5 which doesn't support Iterables in for...of
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
                const arr = other as Array<[TKey, TValue]>;
                this.size = arr.length;
                for (const kvp of arr) {
                    this.items[kvp[0] as any] = kvp[1];
                }
            }
        }
    }

    public clear(): void {
        this.items = {};
        this.size = 0;
        return;
    }

    public delete(key: TKey): boolean {
        const contains = this.has(key);
        if (contains) {
            this.size--;
        }
        this.items[key as any] = undefined;
        return contains;
    }

    public [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
        return this.entries();
    }

    public entries(): IterableIterator<[TKey, TValue]> {
        const items = this.items;
        let key: TKey;
        let value: TValue;
        return {
            [Symbol.iterator](): IterableIterator<[TKey, TValue]> { return this; },
            next(): IteratorResult<[TKey, TValue]> {
                [key, value] = next(items, key);
                return {done: !key, value: [key, value]};
            },
        };
    }

    public forEach(callback: (value: TValue, key: TKey, map: Map<TKey, TValue>) => any): void {
        for (const key in this.items) {
            callback(this.items[key], key as any, this);
        }
        return;
    }

    public get(key: TKey): TValue {
        return this.items[key as any];
    }

    public has(key: TKey): boolean {
        return this.items[key as any] !== undefined;
    }

    public keys(): IterableIterator<TKey> {
        const items = this.items;
        let key: TKey;
        return {
            [Symbol.iterator](): IterableIterator<TKey> { return this; },
            next(): IteratorResult<TKey> {
                [key] = next(items, key);
                return {done: !key, value: key};
            },
        };
    }

    public set(key: TKey, value: TValue): Map<TKey, TValue> {
        if (!this.has(key)) {
            this.size++;
        }
        this.items[key as any] = value;
        return this;
    }

    public values(): IterableIterator<TValue> {
        const items = this.items;
        let key: TKey;
        let value: TValue;
        return {
            [Symbol.iterator](): IterableIterator<TValue> { return this; },
            next(): IteratorResult<TValue> {
                [key, value] = next(items, key);
                return {done: !key, value};
            },
        };
    }
}
