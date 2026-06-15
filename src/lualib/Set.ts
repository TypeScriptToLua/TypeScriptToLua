// See Map.ts for design overview and V8 source references.
export class Set<T extends AnyNotNil> {
    public static [Symbol.species] = Set;
    public [Symbol.toStringTag] = "Set";

    public size = 0;

    // Flat array storage (1-based indices for Lua)
    private keyIndex = new LuaTable<T, number>();
    private orderedKeys = new LuaTable<number, T>();
    private nextSlot = 1;
    private deletedCount = 0;

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
        if (!this.has(value)) {
            this.size++;
            const idx = this.nextSlot;
            this.nextSlot = idx + 1;
            this.keyIndex.set(value, idx);
            this.orderedKeys.set(idx, value);
        }
        return this;
    }

    public clear(): void {
        this.keyIndex = new LuaTable();
        this.orderedKeys = new LuaTable();
        this.nextSlot = 1;
        this.size = 0;
        this.deletedCount = 0;
    }

    public delete(value: T): boolean {
        const idx = this.keyIndex.get(value);
        if (idx === undefined) return false;
        this.size--;
        this.deletedCount++;
        this.keyIndex.delete(value);
        this.orderedKeys.delete(idx);

        if (this.deletedCount > this.size) {
            this.compact();
        }
        return true;
    }

    // See Map.compact() for design explanation.
    private compact(): void {
        const oldKeys = this.orderedKeys;
        const oldNextSlot = this.nextSlot;
        const newKeys = new LuaTable<number, T>();
        let newSlot = 1;
        let holeCount = 0;

        for (let i = 1; i < oldNextSlot; i++) {
            const k = oldKeys.get(i);
            if (k !== undefined) {
                newKeys.set(newSlot, k);
                this.keyIndex.set(k, newSlot);
                newSlot++;
            } else {
                holeCount++;
                oldKeys.set(-holeCount, i as any);
            }
        }

        oldKeys.set(0, newKeys as any);

        this.orderedKeys = newKeys;
        this.nextSlot = newSlot;
        this.deletedCount = 0;
    }

    public forEach(callback: (value: T, key: T, set: Set<T>) => any): void {
        for (const key of this.keys()) {
            callback(key, key, this);
        }
    }

    public has(value: T): boolean {
        return this.keyIndex.get(value) !== undefined;
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    public entries(): IterableIterator<[T, T]> {
        let keys = this.orderedKeys;
        const set = this; // eslint-disable-line @typescript-eslint/no-this-alias
        let idx = 1;
        return {
            [Symbol.iterator](): IterableIterator<[T, T]> {
                return this;
            },
            next(): IteratorResult<[T, T]> {
                while (keys.get(0) !== undefined) {
                    let adj = 0;
                    let h = 1;
                    while (true) {
                        const holePos = keys.get(-h) as any as number | undefined;
                        if (holePos === undefined || holePos >= idx) break;
                        adj++;
                        h++;
                    }
                    idx -= adj;
                    keys = keys.get(0) as any;
                }
                while (idx < set.nextSlot && keys.get(idx) === undefined) {
                    idx++;
                }
                if (idx >= set.nextSlot) {
                    return { done: true, value: undefined! };
                }
                const val = keys.get(idx);
                idx++;
                return { done: false, value: [val, val] as [T, T] };
            },
        };
    }

    public keys(): IterableIterator<T> {
        let keys = this.orderedKeys;
        const set = this; // eslint-disable-line @typescript-eslint/no-this-alias
        let idx = 1;
        return {
            [Symbol.iterator](): IterableIterator<T> {
                return this;
            },
            next(): IteratorResult<T> {
                while (keys.get(0) !== undefined) {
                    let adj = 0;
                    let h = 1;
                    while (true) {
                        const holePos = keys.get(-h) as any as number | undefined;
                        if (holePos === undefined || holePos >= idx) break;
                        adj++;
                        h++;
                    }
                    idx -= adj;
                    keys = keys.get(0) as any;
                }
                while (idx < set.nextSlot && keys.get(idx) === undefined) {
                    idx++;
                }
                if (idx >= set.nextSlot) {
                    return { done: true, value: undefined! };
                }
                const val = keys.get(idx);
                idx++;
                return { done: false, value: val };
            },
        };
    }

    public values(): IterableIterator<T> {
        let keys = this.orderedKeys;
        const set = this; // eslint-disable-line @typescript-eslint/no-this-alias
        let idx = 1;
        return {
            [Symbol.iterator](): IterableIterator<T> {
                return this;
            },
            next(): IteratorResult<T> {
                while (keys.get(0) !== undefined) {
                    let adj = 0;
                    let h = 1;
                    while (true) {
                        const holePos = keys.get(-h) as any as number | undefined;
                        if (holePos === undefined || holePos >= idx) break;
                        adj++;
                        h++;
                    }
                    idx -= adj;
                    keys = keys.get(0) as any;
                }
                while (idx < set.nextSlot && keys.get(idx) === undefined) {
                    idx++;
                }
                if (idx >= set.nextSlot) {
                    return { done: true, value: undefined! };
                }
                const val = keys.get(idx);
                idx++;
                return { done: false, value: val };
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
