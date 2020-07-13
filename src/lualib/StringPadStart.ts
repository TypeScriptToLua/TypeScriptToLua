function __TS__StringPadStart(this: string, maxLength: number, fillString = " "): string {
    if (maxLength !== maxLength) maxLength = 0;
    if (maxLength === -Infinity || maxLength === Infinity) {
        throw "Invalid string length";
    }

    if (this.length >= maxLength || fillString.length === 0) {
        return this;
    }

    maxLength -= this.length;
    if (maxLength > fillString.length) {
        fillString += fillString.repeat(maxLength / fillString.length);
    }

    return string.sub(fillString, 1, Math.floor(maxLength)) + this;
}
