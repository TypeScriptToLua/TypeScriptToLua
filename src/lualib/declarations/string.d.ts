/** @noSelf */
declare namespace string {
    function byte(s: string, i?: number): number | undefined;
    function byte(s: string, i?: number, j?: number): LuaMultiReturn<number[]>;

    function gsub(
        source: string,
        searchValue: string,
        replaceValue: string | ((...groups: string[]) => string),
        n?: number
    ): LuaMultiReturn<[string, number]>;
    function sub(s: string, i: number, j?: number): string;
    function format(formatstring: string, ...args: any[]): string;
    function match(string: string, pattern: string): string;
    function find(
        string: string,
        pattern: string,
        start?: number,
        plainflag?: boolean
    ): LuaMultiReturn<[number, number] | [undefined]>;
}
