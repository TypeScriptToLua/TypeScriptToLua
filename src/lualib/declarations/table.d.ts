/** @noSelfInFile */

declare namespace table {
    function sort<T>(list: T[], compareFn?: (a: T, b: T) => boolean): void;
    function remove<T>(list: T[], idx: number): T;
    function insert<T>(list: T[], idx: number, val: T): void;
    function unpack<T>(list: T[], i?: number, j?: number): T[];
}
