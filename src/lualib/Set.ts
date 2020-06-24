Set = class Set<T> {
    public static [Symbol.species] = Set;
    public [Symbol.toStringTag] = "Set";

    public size = 0;

    private firstKey: T | undefined;
    private lastKey: T | undefined;
    private nextKey = new LuaTable<T, T>();
    private previousKey = new LuaTable<T, T>();

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
            for (const value of array) {
                this.add(value);
            }
        }
    }

    public add(value: T): Set<T> {
        const isNewValue = !this.has(value);
        if (isNewValue) {
            this.size++;
        }

        // Do order bookkeeping
        if (this.firstKey === undefined) {
            this.firstKey = value;
            this.lastKey = value;
        } else if (isNewValue) {
            this.nextKey.set(this.lastKey, value);
            this.previousKey.set(value, this.lastKey);
            this.lastKey = value;
        }

        return this;
    }

    public clear(): void {
        this.nextKey = new LuaTable();
        this.previousKey = new LuaTable();
        this.firstKey = undefined;
        this.lastKey = undefined;
        this.size = 0;
    }

    public delete(value: T): boolean {
        const contains = this.has(value);
        if (contains) {
            this.size--;

            // Do order bookkeeping
            const next = this.nextKey.get(value);
            const previous = this.previousKey.get(value);
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

            this.nextKey.set(value, undefined);
            this.previousKey.set(value, undefined);
        }

        return contains;
    }

    public forEach(callback: (value: T, key: T, set: Set<T>) => any): void {
        for (const key of this.keys()) {
            callback(key, key, this);
        }
    }

    public has(value: T): boolean {
        return this.nextKey.get(value) !== undefined || this.lastKey === value;
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    public entries(): IterableIterator<[T, T]> {
        const nextKey = this.nextKey;
        let key: T = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<[T, T]> {
                return this;
            },
            next(): IteratorResult<[T, T]> {
                const result = { done: !key, value: [key, key] as [T, T] };
                key = nextKey.get(key);
                return result;
            },
        };
    }

    public keys(): IterableIterator<T> {
        const nextKey = this.nextKey;
        let key: T = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<T> {
                return this;
            },
            next(): IteratorResult<T> {
                const result = { done: !key, value: key };
                key = nextKey.get(key);
                return result;
            },
        };
    }

    public values(): IterableIterator<T> {
        const nextKey = this.nextKey;
        let key: T = this.firstKey;
        return {
            [Symbol.iterator](): IterableIterator<T> {
                return this;
            },
            next(): IteratorResult<T> {
                const result = { done: !key, value: key };
                key = nextKey.get(key);
                return result;
            },
        };
    }
};
