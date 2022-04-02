export function __TS__ArrayPush<T>(this: T[], ...items: T[]): number {
    let len = this.length;
    for (const i of $range(1, items.length)) {
        len++;
        this[len - 1] = items[i - 1];
    }
    return len;
}
