import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringEndsWith(this: string, searchString: string, endPosition?: number): boolean {
    endPosition = endPosition === undefined ? this.length : __TS__StringPosition(endPosition, this.length);
    if (endPosition < 0) endPosition = 0;

    return string.sub(this, endPosition - searchString.length + 1, endPosition) === searchString;
}
