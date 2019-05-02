function __TS__StringEndsWith(this: string, searchString: string, endPosition?: number): boolean {
    if (endPosition === undefined || endPosition > this.length) {
        endPosition = this.length;
    }

    return string.sub(this, endPosition - searchString.length + 1, endPosition) === searchString;
}
