function __TS__StringStartsWith(this: string, searchString: string, position?: number): boolean {
    if (position === undefined || position < 0) {
        position = 0;
    }

    return string.sub(this, position + 1, searchString.length + position) === searchString;
}
