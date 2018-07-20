class Set<TValue> {
    public size: number;

    private items: {[key: string]: boolean}; // Key type is actually TValue

    constructor(other: any) {
        this.items = {};
        this.size = 0;

        if (other) {
            this.size = other.size;
            for (const value of other.values()) {
                this.items[value] = true;
            }
        }
    }

    public add(value: TValue) {
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

    public entries(): Array<[TValue, TValue]> {
        const out = [];
        for (const key in this.items) {
            out[out.length] = [key, key];
        }
        return out;
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

    public keys(): TValue[] {
        const out = [];
        for (const key in this.items) {
            out[out.length] = key;
        }
        return out;
    }

    public values(): TValue[] {
        const out = [];
        for (const key in this.items) {
            out[out.length] = key;
        }
        return out;
    }
}
