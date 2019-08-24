Set = class Set<T> {
    public static [Symbol.species] = Set;
    public [Symbol.toStringTag] = "Set";

    // Key type is actually T
    private items: { [key: string]: boolean } = {};
    public size = 0;

    // Key-order variables
    private firstKey: T | undefined;
    private lastKey: T | undefined;
    private nextKey: { [key: string]: T | undefined } = {};
    private previousKey: { [key: string]: T | undefined } = {};

    constructor(values?: Iterable<T> | T[]) {
        if (values === undefined) return;

        const iterable = values as Iterable<T>;
        if (iterable[Symbol.iterator]) {
            // Iterate manually because Set is compiled with ES5 which doesn't support Iterables in for...of
            const iterator = iterable[Symbol.iterator]();
            while (true) {
                const result = iterator.next();
                if (result.done) {
                    break;
                }
                this.add(result.value);
            }
        } else {
            const array = values as T[];
            this.size = array.length;
            for (const value of array) {
                this.items[value as any] = true;
            }
        }
    }

    public add(value: T): Set<T> {
        const isNewValue = !this.has(value);
        if (isNewValue) {
            this.size++;
        }
        this.items[value as any] = true;

        // Do order bookkeeping
        if (this.firstKey === undefined) {
            this.firstKey = value;
            this.lastKey = value;
        } else if (isNewValue) {
            this.nextKey[this.lastKey as any] = value;
            this.previousKey[value as any] = this.lastKey;
            this.lastKey = value;
        }

        return this;
    }

    public clear(): void {
        this.items = {};
        this.nextKey = {};
        this.previousKey = {};
        this.size = 0;
        return;
    }

    public delete(value: T): boolean {
        const contains = this.has(value);
        if (contains) {
            this.size--;

            // Do order bookkeeping
            const next = this.nextKey[value as any];
            const previous = this.previousKey[value as any];
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

            this.nextKey[value as any] = undefined;
            this.previousKey[value as any] = undefined;
        }
        this.items[value as any] = undefined;
        return contains;
    }

    public forEach(callback: (value: T, key: T, set: Set<T>) => any): void {
        for (const key of this.keys()) {
            callback(key, key, this);
        }
    }

    public has(value: T): boolean {
        return this.items[value as any] === true;
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    public entries(): IterableIterator<[T, T]> {
        const items = this.items;
        let key: T;
        return {
            [Symbol.iterator](): IterableIterator<[T, T]> {
                return this;
            },
            next(): IteratorResult<[T, T]> {
                [key] = next(items, key);
                return { done: !key, value: [key, key] };
            },
        };
    }

    public keys(): IterableIterator<T> {
        const items = this.items;
        let key: T;
        return {
            [Symbol.iterator](): IterableIterator<T> {
                return this;
            },
            next(): IteratorResult<T> {
                [key] = next(items, key);
                return { done: !key, value: key };
            },
        };
    }

    public values(): IterableIterator<T> {
        const items = this.items;
        let key: T;
        return {
            [Symbol.iterator](): IterableIterator<T> {
                return this;
            },
            next(): IteratorResult<T> {
                [key] = next(items, key);
                return { done: !key, value: key };
            },
        };
    }
};
