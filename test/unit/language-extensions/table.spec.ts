import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import { invalidTableExtensionUse, invalidTableSetExpression } from "../../../src/transformation/utils/diagnostics";

const tableProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

describe("LuaTableGet & LuaTableSet extensions", () => {
    test("stand-alone function", () => {
        util.testModule`
            declare const getTable: LuaTableGet<{}, string, number>;
            declare const setTable: LuaTableSet<{}, string, number>;
            const tbl = {};
            setTable(tbl, "foo", 3);
            const result = getTable(tbl, "foo");
            export { result }
        `
            .setOptions(tableProjectOptions)
            .setReturnExport("result")
            .expectToEqual(3);
    });

    test("namespace function", () => {
        util.testModule`
            declare namespace Table {
                export const get: LuaTableGet<{}, string, number>;
                export const set: LuaTableSet<{}, string, number>;
            }
            const tbl = {};
            Table.set(tbl, "foo", 3);
            const result = Table.get(tbl, "foo");
            export { result }
        `
            .setOptions(tableProjectOptions)
            .setReturnExport("result")
            .expectToEqual(3);
    });

    test("method", () => {
        util.testModule`
            interface Table {
                get: LuaTableGetMethod<string, number>;
                set: LuaTableSetMethod<string, number>;
            }
            const tbl = {} as Table;
            tbl.set("foo", 3);
            const result = tbl.get("foo");
            export { result }
        `
            .setOptions(tableProjectOptions)
            .setReturnExport("result")
            .expectToEqual(3);
    });

    test.each([
        "const foo: unknown = getTable;",
        "const foo = `${getTable}`;",
        "declare function foo(getTable: LuaTableGet<{}, string, number>): void; foo(getTable);",
        "const foo = (getTable as any)(1, 2);",
        "const foo = [getTable];",
    ])("invalid use (%p)", statement => {
        util.testModule`
            declare const getTable: LuaTableGet<{}, string, number>;
            ${statement}
        `
            .setOptions(tableProjectOptions)
            .expectDiagnosticsToMatchSnapshot([invalidTableExtensionUse.code]);
    });

    test.each([
        'const foo = setTable({}, "foo", 3);',
        'const foo = `${setTable({}, "foo", 3)}`;',
        'declare function foo(arg: any): void; foo(setTable({}, "foo", 3));',
        'const foo = [setTable({}, "foo", 3)];',
    ])("LuaTableSet invalid use as expression (%p)", expression => {
        util.testModule`
            declare const setTable: LuaTableSet<{}, string, number>;
            ${expression}
        `
            .setOptions(tableProjectOptions)
            .expectDiagnosticsToMatchSnapshot([invalidTableSetExpression.code]);
    });
});

describe("LuaTable extension interface", () => {
    test("untyped table", () => {
        util.testFunction`
            const tbl = new LuaTable();
            tbl.set("foo", 3);
            return tbl.get("foo");
        `
            .setOptions(tableProjectOptions)
            .expectToEqual(3);
    });

    test("typed table", () => {
        util.testFunction`
            const tbl = new LuaTable<string, number>();
            tbl.set("foo", 3);
            return tbl.get("foo");
        `
            .setOptions(tableProjectOptions)
            .expectToEqual(3);
    });

    test("object keyed table", () => {
        util.testFunction`
            interface Key { keyStr: string }
            const key: Key = {keyStr: "foo"};
            const tbl = new LuaTable<Key, number>();
            tbl.set(key, 3);
            return tbl.get(key);
        `
            .setOptions(tableProjectOptions)
            .expectToEqual(3);
    });

    test("table length", () => {
        util.testFunction`
            const tbl = new LuaTable<number, string>();
            tbl.set(1, "foo");
            tbl.set(3, "bar");
            return tbl.length();
        `
            .setOptions(tableProjectOptions)
            .expectToEqual(1);
    });
});
