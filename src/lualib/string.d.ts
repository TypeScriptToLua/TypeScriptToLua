/** @luaIterator */
interface GMatchResult extends Iterable<string> { }

declare namespace string {
    /** @tupleReturn */
    function gsub(source: string, searchValue: string, replaceValue: string): [string, number];

    function gmatch(haystack: string, pattern: string): GMatchResult;
}
