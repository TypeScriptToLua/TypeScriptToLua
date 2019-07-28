/** @noSelf */
declare namespace string {
    /** @tupleReturn */
    function gsub(
        source: string,
        searchValue: string,
        replaceValue: string | ((...groups: string[]) => string),
        n?: number
    ): [string, number];
    function sub(s: string, i: number, j?: number): string;
}
