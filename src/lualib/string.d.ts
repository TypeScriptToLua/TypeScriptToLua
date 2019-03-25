/** @luaIterator */
interface GMatchResult extends Array<string> { }

/** @noSelf */
declare namespace string {
    /** @tupleReturn */
    function gsub(source: string, searchValue: string, replaceValue: string): [string, number];
    function gsub(source: string, searchValue: string, replaceValue: (this: void, ...groups: string[]) => string): [string, number];

    function gmatch(haystack: string, pattern: string): GMatchResult;
}
