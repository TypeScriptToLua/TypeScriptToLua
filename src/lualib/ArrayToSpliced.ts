export function __TS__ArrayToSpliced<T>(this: T[], start: number, deleteCount: number, ...items: T[]): T[] {
    const copy = [...this];
    copy.splice(start, deleteCount, ...items);
    return copy;
}
