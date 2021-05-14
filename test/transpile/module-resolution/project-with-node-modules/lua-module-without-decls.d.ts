/** @noSelfInFile */
declare module "lua-module-without-decls" {
    function foo(this: void): string;
    function bar(this: void, param: string): string;
}

declare module "lua-module-without-decls/baz" {
    function baz(this: void): string;
}
