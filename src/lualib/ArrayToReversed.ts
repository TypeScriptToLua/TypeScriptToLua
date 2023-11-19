export function __TS__ArrayToReversed<T>(this: T[]): T[] {
    const copy = [...this];
    copy.reverse();
    return copy;
}
