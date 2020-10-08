/** @noSelf */
declare namespace string {
    function byte(s: string, i?: number): number | undefined;
    /** @tupleReturn */
    function byte(s: string, i?: number, j?: number): number[];

    /** @tupleReturn */
    function gsub(
        source: string,
        searchValue: string,
        replaceValue: string | ((...groups: string[]) => string),
        n?: number
    ): [string, number];
    function sub(s: string, i: number, j?: number): string;
    function format(formatstring: string, ...args: any[]): string;
    function match(string: string, pattern: string): string;
}
