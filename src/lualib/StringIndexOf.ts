export function __TS__StringIndexOf(this: string, searchString: string, position?: number): number {
    // JS truncates position and clamps it to [0, length]; undefined and NaN count as 0
    if (position === undefined || position !== position || position < 0) {
        position = 0;
    } else if (position > this.length) {
        position = this.length;
    } else {
        position = math.floor(position);
    }
    // http://lua-users.org/wiki/StringLibraryTutorial
    const [index] = string.find(this, searchString, position + 1, true);
    return index === undefined ? -1 : index - 1;
}
