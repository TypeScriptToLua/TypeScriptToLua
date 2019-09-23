WeakSet = class WeakSet<T extends object> {
    public static [Symbol.species] = WeakSet;
    public [Symbol.toStringTag] = "WeakSet";

    private items = new LuaTable<T, boolean>();

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
                this.items.set(result.value, true);
            }
        } else {
            for (const value of values as T[]) {
                this.items.set(value, true);
            }
        }
    }

    public add(value: T): this {
        this.items.set(value, true);
        return this;
    }

    public delete(value: T): boolean {
        const contains = this.has(value);
        this.items.set(value, undefined);
        return contains;
    }

    public has(value: T): boolean {
        return this.items.get(value) === true;
    }
};
