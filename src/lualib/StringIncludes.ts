export function __TS__StringIncludes(this: string, searchString: string, position?: number): boolean {
    // JS clamps position to [0, length]; NaN counts as 0
    if (position === undefined || position !== position || position < 0) {
        position = 0;
    } else if (position > this.length) {
        position = this.length;
    }
    // http://lua-users.org/wiki/StringLibraryTutorial
    const [index] = string.find(this, searchString, position + 1, true);
    return index !== undefined;
}
