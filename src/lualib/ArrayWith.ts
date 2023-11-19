export function __TS__ArrayWith<T>(this: T[], index: number, value: T): T[] {
    const copy = [...this];
    copy[index] = value;
    return copy;
}
