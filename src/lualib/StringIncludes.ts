import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringIncludes(this: string, searchString: string, position?: number): boolean {
    position = position === undefined ? 0 : __TS__StringPosition(position, this.length);
    if (position < 0) position = 0;
    // http://lua-users.org/wiki/StringLibraryTutorial
    const [index] = string.find(this, searchString, position + 1, true);
    return index !== undefined;
}
