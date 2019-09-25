/** @noSelfInFile */

declare namespace debug {
    function traceback(...args: any[]): string;
    function getinfo(i: number, what?: string): any;
}
