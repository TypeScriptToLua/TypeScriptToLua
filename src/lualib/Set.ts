export class Set<T extends AnyNotNil> {
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
            this.nextKey.set(this.lastKey!, value);
            this.previousKey.set(value, this.lastKey!);
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
            if (next !== undefined && previous !== undefined) {
                this.nextKey.set(previous, next);
                this.previousKey.set(next, previous);
            } else if (next !== undefined) {
                this.firstKey = next;
                this.previousKey.set(next, undefined!);
            } else if (previous !== undefined) {
                this.lastKey = previous;
                this.nextKey.set(previous, undefined!);
            } else {
                this.firstKey = undefined;
                this.lastKey = undefined;
            }

            this.nextKey.set(value, undefined!);
            this.previousKey.set(value, undefined!);
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
        let key: T = this.firstKey!;
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
        let key: T = this.firstKey!;
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
        let key: T = this.firstKey!;
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

    /**
     * @returns a new Set containing all the elements in this Set and also all the elements in the argument.
     */
    public union(other: ReadonlySet<T>): Set<T> {
        const result = new Set<T>(this);
        for (const item of other) {
            result.add(item);
        }
        return result;
    }

    /**
     * @returns a new Set containing all the elements which are both in this Set and in the argument.
     */
    public intersection(other: ReadonlySet<T>) {
        const result = new Set<T>();
        for (const item of this) {
            if (other.has(item)) {
                result.add(item);
            }
        }
        return result;
    }

    /**
     * @returns a new Set containing all the elements in this Set which are not also in the argument.
     */
    public difference(other: ReadonlySet<T>): Set<T> {
        const result = new Set<T>(this);
        for (const item of other) {
            result.delete(item);
        }
        return result;
    }

    /**
     * @returns a new Set containing all the elements which are in either this Set or in the argument, but not in both.
     */
    public symmetricDifference(other: ReadonlySet<T>): Set<T> {
        const result = new Set<T>(this);
        for (const item of other) {
            if (this.has(item)) {
                result.delete(item);
            } else {
                result.add(item);
            }
        }
        return result;
    }

    /**
     * @returns a boolean indicating whether all the elements in this Set are also in the argument.
     */
    public isSubsetOf(other: ReadonlySet<unknown>): boolean {
        for (const item of this) {
            if (!other.has(item)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @returns a boolean indicating whether all the elements in the argument are also in this Set.
     */
    public isSupersetOf(other: ReadonlySet<unknown>): boolean {
        for (const item of other) {
            if (!this.has(item as T)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @returns a boolean indicating whether this Set has no elements in common with the argument.
     */
    public isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
        for (const item of this) {
            if (other.has(item)) {
                return false;
            }
        }
        return true;
    }
}
