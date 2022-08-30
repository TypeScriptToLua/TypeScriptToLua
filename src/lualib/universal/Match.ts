/** @noSelfInFile */

export function __TS__Match(s: string, pattern: string, init?: number): LuaMultiReturn<string[]> {
    return string.match(s, pattern, init);
}
