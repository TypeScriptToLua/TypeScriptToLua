declare function setmetatable<T extends object>(obj: T, metatable: any): T;

class WeakSet<TValue extends object> {
    private items: {[key: string]: boolean}; // Key type is actually TValue

    constructor(other: Iterable<TValue> | TValue[]) {
        this.items = {};
        setmetatable(this.items, { __mode: 'k' });

        if (other) {
            const iterable = other as Iterable<TValue>;
            if (iterable[Symbol.iterator]) {
                // Iterate manually because WeakSet is compiled with ES5 which doesn't support Iterables in for...of
                const iterator = iterable[Symbol.iterator]();
                while (true) {
                    const result = iterator.next();
                    if (result.done) {
                        break;
                    }
                    this.add(result.value);
                }
            } else {
                for (const value of other as TValue[]) {
                    this.items[value as any] = true;
                }
            }
        }
    }

    public add(value: TValue): WeakSet<TValue> {
        this.items[value as any] = true;
        return this;
    }

    public delete(value: TValue): boolean {
        const contains = this.has(value);
        this.items[value as any] = undefined;
        return contains;
    }

    public has(value: TValue): boolean {
        return this.items[value as any] === true;
    }
}
