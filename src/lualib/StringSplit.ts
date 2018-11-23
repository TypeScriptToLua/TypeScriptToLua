function __TS__StringSplit(source: string, separator?: string, limit?: number): string[] {
    if (limit === undefined) {
        limit = 4294967295;
    }

    if (limit === 0) {
        return [];
    }

    const out = [];
    let index = 0;
    let count = 0;

    if (separator === undefined || separator === "") {
        while (index < source.length - 1 && count < limit) {
            out[count] = source[index];
            count++;
            index++;
        }
    } else {
        const separatorLength = separator.length;
        let nextIndex = source.indexOf(separator);
        while (nextIndex >= 0 && count < limit) {
            out[count] = source.substring(index, nextIndex);
            count++;
            index = nextIndex + separatorLength;
            nextIndex = source.indexOf(separator, index);
        }
    }

    if (count < limit) {
        out[count] = source.substring(index);
    }

    return out;
}
