function __TS__StringIncludes(this: string, searchString: string, position?: number): boolean {
    // http://lua-users.org/wiki/StringLibraryTutorial
    if (!position) {
        position = 1;
    } else {
        position += 1;
    }
    return string.find(this, searchString, position, true) !== undefined;
}
