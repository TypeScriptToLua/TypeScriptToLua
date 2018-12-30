/** @tupleReturn */
declare function next<TKey, TValue>(t: { [k: string]: TValue }, index?: TKey): [TKey, TValue];

class Set<TValue> {
    public size: number;

    private items: {[key: string]: boolean}; // Key type is actually TValue

    constructor(other: Set<TValue> | TValue[]) {
        this.items = {};
        this.size = 0;

        if (other instanceof Set) {
            this.size = other.size;
            other.forEach(v => { this.items[v as any] = true; });
        } else if (other !== undefined) {
            this.size = other.length;
            for (const value of other) {
                this.items[value as any] = true as any;
            }
        }
    }

    public add(value: TValue): Set<TValue> {
        if (!this.has(value)) {
            this.size++;
        }
        this.items[value as any] = true;
        return this;
    }

    public clear(): void {
        this.items = {};
        this.size = 0;
        return;
    }

    public delete(value: TValue): boolean {
        const contains = this.has(value);
        if (contains) {
            this.size--;
        }
        this.items[value as any] = undefined;
        return contains;
    }

    public [Symbol.iterator](): IterableIterator<TValue> {
        return this.values();
    }

    public entries(): IterableIterator<[TValue, TValue]> {
        const items = this.items;
        let key: TValue;
        return {
            [Symbol.iterator](): IterableIterator<[TValue, TValue]> { return this; },
            next(): IteratorResult<[TValue, TValue]> {
                [key] = next(items, key);
                return {done: !key, value: [key, key]};
            },
        };
    }

    public forEach(callback: (value: TValue, key: TValue, set: Set<TValue>) => any): void {
        for (const key in this.items) {
            callback(key as any, key as any, this);
        }
        return;
    }

    public has(value: TValue): boolean {
        return this.items[value as any] === true;
    }

    public keys(): IterableIterator<TValue> {
        const items = this.items;
        let key: TValue;
        return {
            [Symbol.iterator](): IterableIterator<TValue> { return this; },
            next(): IteratorResult<TValue> {
                [key] = next(items, key);
                return {done: !key, value: key};
            },
        };
    }

    public values(): IterableIterator<TValue> {
        const items = this.items;
        let key: TValue;
        return {
            [Symbol.iterator](): IterableIterator<TValue> { return this; },
            next(): IteratorResult<TValue> {
                [key] = next(items, key);
                return {done: !key, value: key};
            },
        };
    }
}
