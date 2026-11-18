import { __TS__StringGetSubstitution } from "./StringGetSubstitution";

const sub = string.sub;
const find = string.find;
export function __TS__StringReplaceAll(
    this: void,
    source: string,
    searchValue: string,
    replaceValue: string | ((match: string, offset: number, string: string) => string)
): string {
    if (typeof replaceValue === "string" && !find(replaceValue, "$", undefined, true)) {
        const concat = table.concat(source.split(searchValue), replaceValue);
        if (searchValue.length === 0) {
            return replaceValue + concat + replaceValue;
        }
        return concat;
    }
    const parts: string[] = [];
    let partsIndex = 1;

    if (searchValue.length === 0) {
        parts[0] =
            typeof replaceValue === "string"
                ? __TS__StringGetSubstitution("", source, 1, replaceValue)
                : replaceValue("", 0, source);
        partsIndex = 2;
        for (const i of $range(1, source.length)) {
            parts[partsIndex - 1] = sub(source, i, i);
            parts[partsIndex] =
                typeof replaceValue === "string"
                    ? __TS__StringGetSubstitution("", source, i + 1, replaceValue)
                    : replaceValue("", i, source);
            partsIndex += 2;
        }
    } else {
        let currentPos = 1;
        while (true) {
            const [startPos, endPos] = find(source, searchValue, currentPos, true);
            if (!startPos) break;
            parts[partsIndex - 1] = sub(source, currentPos, startPos - 1);
            parts[partsIndex] =
                typeof replaceValue === "string"
                    ? __TS__StringGetSubstitution(searchValue, source, startPos, replaceValue)
                    : replaceValue(searchValue, startPos - 1, source);
            partsIndex += 2;

            currentPos = endPos + 1;
        }
        parts[partsIndex - 1] = sub(source, currentPos);
    }
    return table.concat(parts);
}
