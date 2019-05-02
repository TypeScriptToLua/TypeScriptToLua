/** @luaIterator */
interface GMatchResult extends Array<string> { }

/** @noSelf */
declare namespace string {
    /** @tupleReturn */
    function gsub(source: string, searchValue: string, replaceValue: string): [string, number];
    /** @tupleReturn */
    function gsub(source: string, searchValue: string, replaceValue: (...groups: string[]) => string): [string, number];

    function gmatch(haystack: string, pattern: string): GMatchResult;
    function sub(s: string, i: number, j?: number): string;
}
