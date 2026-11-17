import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringStartsWith(this: string, searchString: string, position?: number): boolean {
    position = position === undefined ? 0 : __TS__StringPosition(position, this.length);
    if (position < 0) position = 0;

    return string.sub(this, position + 1, searchString.length + position) === searchString;
}
