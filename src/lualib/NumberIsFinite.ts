function __TS__NumberIsFinite(this: void, value: unknown): boolean {
    return typeof value === "number" && value === value && value !== Infinity && value !== -Infinity;
}
