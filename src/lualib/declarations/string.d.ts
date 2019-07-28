/** @noSelf */
declare namespace string {
    /** @luaIterator @tupleReturn */
    interface GmatchIterable extends Array<string[]> {}
    function gmatch(string: string, pattern: string): GmatchIterable;
    /** @tupleReturn */
    function gsub(
        source: string,
        searchValue: string,
        replaceValue: string | ((...groups: string[]) => string),
        n?: number
    ): [string, number];
    function sub(s: string, i: number, j?: number): string;
}
