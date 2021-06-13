import { annotationRemoved } from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

test.each(["extension", "metaExtension"])("extension removed", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("phantom removed", () => {
    util.testModule`
        /** @phantom **/
        namespace A {
            function nsMember() {}
        }
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("pureAbstract removed", () => {
    util.testModule`
        /** @pureAbstract */
        declare class ClassA {}
        class ClassB extends ClassA {}
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("forRange removed", () => {
    util.testModule`
        /** @forRange */
        declare function forRange(start: number, limit: number, step?: number): number[];
        for (const i of forRange(1, 10)) {}
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("vararg removed", () => {
    util.testModule`
        /** @vararg */
        type VarArg<T extends any[]> = T & { readonly __brand: unique symbol };
        function foo(...args: any[]) {}
        function vararg(...args: VarArg<any[]>) {
            foo(...args);
        }
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("luaiterator removed", () => {
    util.testFunction`
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<string> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i++]) as any;
        }
        let result = "";
        for (let e of luaIter()) { result += e; }
        return result;
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

const tableLibClass = `
/** @luaTable */
declare class Table<K extends {} = {}, V = any> {
    length: number;
    constructor(notAllowed?: any);
    set(key?: K, value?: V, notAllowed?: any): void;
    get(key?: K, notAllowed?: any): V;
    other(): void;
}
declare let tbl: Table;
`;

test("LuaTable removed warning constructor", () => {
    util.testModule("const table = new Table();")
        .setTsHeader(tableLibClass)
        .expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("LuaTable removed warning property access length", () => {
    util.testFunction`
        return tbl.length;
    `
        .setTsHeader(tableLibClass)
        .expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("LuaTable removed warning property access get", () => {
    util.testFunction`
        return tbl.get("foo");
    `
        .setTsHeader(tableLibClass)
        .expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("LuaTable deprecation warning property access set", () => {
    util.testFunction`
        return tbl.set("foo", 0);
    `
        .setTsHeader(tableLibClass)
        .expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});
