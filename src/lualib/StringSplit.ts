const sub = string.sub;
const find = string.find;
export function __TS__StringSplit(this: void, source: string, separator?: string, limit?: number): string[] {
    if (limit === undefined) {
        limit = 4294967295;
    } else {
        // Like JS ToUint32: -1 wraps around to "no limit", NaN and Infinity become 0
        limit = Math.floor(limit) % 4294967296;
        if (limit < 0) {
            // Lua 5.0 math.mod keeps the sign of the dividend
            limit += 4294967296;
        }
    }

    if (limit !== limit || limit === 0) {
        return [];
    }

    const result = [];
    let resultIndex = 1;

    if (separator === undefined || separator === "") {
        for (const i of $range(1, Math.min(source.length, limit))) {
            result[resultIndex - 1] = sub(source, i, i);
            resultIndex++;
        }
    } else {
        let currentPos = 1;
        while (resultIndex <= limit) {
            const [startPos, endPos] = find(source, separator, currentPos, true);
            if (!startPos) break;
            result[resultIndex - 1] = sub(source, currentPos, startPos - 1);
            resultIndex++;
            currentPos = endPos + 1;
        }

        if (resultIndex <= limit) {
            result[resultIndex - 1] = sub(source, currentPos);
        }
    }

    return result;
}
