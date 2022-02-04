const sub = string.sub;
export function __TS__StringReplace(
    this: void,
    source: string,
    searchValue: string,
    replaceValue: string | ((match: string, offset: number, string: string) => string)
): string {
    const [startPos, endPos] = string.find(source, searchValue, undefined, true);
    if (!startPos) {
        return source;
    }
    const before = sub(source, 1, startPos - 1);
    const replacement =
        typeof replaceValue === "string" ? replaceValue : replaceValue(searchValue, startPos - 1, source);
    const after = sub(source, endPos + 1);
    return before + replacement + after;
}
