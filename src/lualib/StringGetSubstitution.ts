const sub = string.sub;
const find = string.find;

/**
 * Expands the `$` patterns of a string replacement for a match of a plain string search
 * (GetSubstitution in the spec). Without capture groups only `$$`, `$&`, `` $` `` and `$'`
 * are special; anything else after `$` is kept as written.
 *
 * @param matched the matched text
 * @param source the whole string being searched
 * @param position the 1-based position of the match in `source`
 * @param replacement the replacement string
 */
export function __TS__StringGetSubstitution(
    this: void,
    matched: string,
    source: string,
    position: number,
    replacement: string
): string {
    if (!find(replacement, "$", undefined, true)) {
        return replacement;
    }

    const parts: string[] = [];
    let partsIndex = 1;
    let literalStart = 1;
    let searchFrom = 1;
    while (true) {
        const [dollar] = find(replacement, "$", searchFrom, true);
        if (!dollar) break;

        const next = sub(replacement, dollar + 1, dollar + 1);
        let expansion: string | undefined;
        if (next === "$") {
            expansion = "$";
        } else if (next === "&") {
            expansion = matched;
        } else if (next === "`") {
            expansion = sub(source, 1, position - 1);
        } else if (next === "'") {
            expansion = sub(source, position + matched.length);
        }

        if (expansion === undefined) {
            searchFrom = dollar + 1;
        } else {
            parts[partsIndex - 1] = sub(replacement, literalStart, dollar - 1);
            parts[partsIndex] = expansion;
            partsIndex += 2;
            literalStart = dollar + 2;
            searchFrom = dollar + 2;
        }
    }
    parts[partsIndex - 1] = sub(replacement, literalStart);
    return table.concat(parts);
}
