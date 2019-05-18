WeakSet = class WeakSet<T extends object> {
    public static [Symbol.species] = WeakSet;
    public [Symbol.toStringTag] = "WeakSet";

    // Key type is actually T
    private items: { [key: string]: boolean } = {};

    constructor(values?: Iterable<T> | T[]) {
        setmetatable(this.items, { __mode: "k" });
        if (values === undefined) return;

        const iterable = values as Iterable<T>;
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
            for (const value of values as T[]) {
                this.items[value as any] = true;
            }
        }
    }

    public add(value: T): this {
        this.items[value as any] = true;
        return this;
    }

    public delete(value: T): boolean {
        const contains = this.has(value);
        this.items[value as any] = undefined;
        return contains;
    }

    public has(value: T): boolean {
        return this.items[value as any] === true;
    }
};
