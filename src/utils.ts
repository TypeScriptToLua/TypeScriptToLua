export const normalizeSlashes = (filePath: string) => filePath.replace(/\\/g, "/");

export function flatMap<T, U>(array: readonly T[], callback: (value: T, index: number) => U | readonly U[]): U[] {
    const result: U[] = [];

    for (const [index, value] of array.entries()) {
        const mappedValue = callback(value, index);
        if (Array.isArray(mappedValue)) {
            result.push(...mappedValue);
        } else {
            result[result.length] = mappedValue as U;
        }
    }

    return result;
}
