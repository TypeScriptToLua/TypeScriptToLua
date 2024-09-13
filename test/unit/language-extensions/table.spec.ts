import * as util from "../../util";
import { invalidCallExtensionUse } from "../../../src/transformation/utils/diagnostics";

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
            .withLanguageExtensions()
            .setReturnExport("result")
            .expectToEqual(3);
    });

    test("stand-alone function with preceding statements", () => {
        util.testModule`
            declare const setTable: LuaTableSet<{}, string, string>;
            const values: any[] = []
            const tbl: any = {};
            const get = (value: any) => {
                values.push(value)
                return value
            }
            let x = "a"
            setTable(tbl, x += "b", x += "c")
            export const result = tbl.ab
        `
            .withLanguageExtensions()
            .setReturnExport("result")
            .expectToEqual("abc");
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
            .withLanguageExtensions()
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
            .withLanguageExtensions()
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
            .withLanguageExtensions()
            .expectDiagnosticsToMatchSnapshot([invalidCallExtensionUse.code]);
    });
});

describe("LuaTableHas extension", () => {
    test("LuaTableHas standalone function", () => {
        util.testModule`
            declare const tableHas: LuaTableHas<{}, string>;
            const table = { foo: "bar" };

            export const hasFoo = tableHas(table, "foo");
            export const hasBaz = tableHas(table, "baz");
        `
            .withLanguageExtensions()
            .expectToEqual({ hasFoo: true, hasBaz: false });
    });

    test("LuaTableHas nested expression", () => {
        util.testModule`
            declare const tableHas: LuaTableHas<{}, string>;
            const table = { foo: "bar" };

            export const result = \`table has foo: \${tableHas(table, "foo")}\`;
        `
            .withLanguageExtensions()
            .expectToEqual({ result: "table has foo: true" });
    });

    test("LuaTableHas namespace function", () => {
        util.testModule`
            declare namespace Table {
                export const tableHas: LuaTableHas<{}, string>;
            }
            const table = { foo: "bar" };

            export const hasFoo = Table.tableHas(table, "foo");
            export const hasBaz = Table.tableHas(table, "baz");
        `
            .withLanguageExtensions()
            .expectToEqual({ hasFoo: true, hasBaz: false });
    });

    test("LuaTableHasMethod method", () => {
        util.testModule`
            interface TableWithHas {
                has: LuaTableHasMethod<string>;
                set: LuaTableSetMethod<string, number>;
            }
            const table = {} as TableWithHas;
            table.set("foo", 42);

            export const hasFoo = table.has("foo");
            export const hasBaz = table.has("baz");
        `
            .withLanguageExtensions()
            .expectToEqual({ hasFoo: true, hasBaz: false });
    });

    test("LuaTableHas as statement", () => {
        util.testModule`
            declare const tableHas: LuaTableHas<{}, string>;
            const table = { foo: "bar" };

            let count = 0;
            function getKey() {
                count++;
                return "foo";
            }

            // The result is not captured, but the expression will be evaulated
            tableHas(table, getKey());

            export const numCalls = count;
        `
            .withLanguageExtensions()
            .expectToEqual({ numCalls: 1 });
    });

    test.each([
        "const foo: unknown = tableHas;",
        "const foo = `${tableHas}`;",
        "declare function foo(tableHas: LuaTableHas<{}, string>): void; foo(tableHas);",
        "const foo = (tableHas as any)(1, 2);",
        "const foo = [tableHas];",
    ])("invalid use (%p)", statement => {
        util.testModule`
            declare const tableHas: LuaTableHas<{}, string>;
            ${statement}
        `
            .withLanguageExtensions()
            .expectDiagnosticsToMatchSnapshot([invalidCallExtensionUse.code]);
    });

    test.each(["LuaTable<string, number>", "LuaMap<string, number>", "LuaSet<string>"])(
        "invalid use method assignment (%p)",
        type => {
            util.testModule`
                const table = new ${type}();
                const has = table.has;
            `
                .withLanguageExtensions()
                .expectDiagnosticsToMatchSnapshot([invalidCallExtensionUse.code]);
        }
    );

    test.each(["LuaTable<string, number>", "LuaMap<string, number>", "LuaSet<string>"])(
        "invalid use method expression (%p)",
        type => {
            util.testModule`
                const table = new ${type}();
                ["a", "b", "c"].map(table.has);
            `
                .withLanguageExtensions()
                .expectDiagnosticsToMatchSnapshot([invalidCallExtensionUse.code]);
        }
    );
});

describe("LuaTableDelete extension", () => {
    test("LuaTableDelete standalone function", () => {
        util.testModule`
            declare const tableDelete: LuaTableDelete<{}, string>;

            export const table = { foo: "bar", baz: "baz" };
            tableDelete(table, "foo");
        `
            .withLanguageExtensions()
            .expectToEqual({ table: { baz: "baz" } });
    });

    test("LuaTableDelete namespace function", () => {
        util.testModule`
            declare namespace Table {
                export const tableDelete: LuaTableDelete<{}, string>;
            }

            export const table = { foo: "bar", baz: "baz" };
            Table.tableDelete(table, "foo");
        `
            .withLanguageExtensions()
            .expectToEqual({ table: { baz: "baz" } });
    });

    test("LuaTableDeleteMethod method", () => {
        util.testModule`
            interface TableWithDelete {
                delete: LuaTableDeleteMethod<string>;
                set: LuaTableSetMethod<string, number>;
            }
            export const table = {} as TableWithDelete;
            table.set("foo", 42);
            table.set("bar", 12);
            table.delete("foo");
        `
            .withLanguageExtensions()
            .expectToEqual({ table: { bar: 12 } });
    });
});

describe("LuaTableAddKey extension", () => {
    test("LuaTableAddKey standalone function", () => {
        util.testModule`
            declare const tableAddKey: LuaTableAddKey<{}, string>;
            export const table = { foo: "bar" };
            tableAddKey(table, "baz");
        `
            .withLanguageExtensions()
            .expectToEqual({ table: { foo: "bar", baz: true } });
    });

    test("LuaTableAddKey namespace function", () => {
        util.testModule`
            declare namespace Table {
                export const tableAddKey: LuaTableAddKey<{}, string>;
            }
            export const table = { foo: "bar" };
            Table.tableAddKey(table, "baz");
        `
            .withLanguageExtensions()
            .expectToEqual({ table: { foo: "bar", baz: true } });
    });

    test("LuaTableAddKey method", () => {
        util.testModule`
            interface TableWithAddKey {
                addKey: LuaTableAddKeyMethod<string>;
            }
            export const table = {} as TableWithAddKey;
            table.addKey("bar");
        `
            .withLanguageExtensions()
            .expectToEqual({ table: { bar: true } });
    });
});

describe("LuaIsEmpty extension", () => {
    test("LuaIsEmpty standalone function", () => {
        util.testModule`
            declare const isTableEmpty: LuaTableIsEmpty<{}>;

            const table = { foo: "bar", baz: "baz" };
            const emptyTable = {};

            export const result = [isTableEmpty(table), isTableEmpty(emptyTable)];
        `
            .withLanguageExtensions()
            .expectToEqual({ result: [false, true] });
    });

    test("LuaIsEmpty namespace function", () => {
        util.testModule`
            declare namespace Table {
                export const isTableEmpty: LuaTableIsEmpty<{}>;
            }

            const table = { foo: "bar", baz: "baz" };
            const emptyTable = {};

            export const result = [Table.isTableEmpty(table), Table.isTableEmpty(emptyTable)];
        `
            .withLanguageExtensions()
            .expectToEqual({ result: [false, true] });
    });

    test("LuaTableIsEmptyMethod method", () => {
        util.testModule`
            interface TableWithIsEmpty {
                isEmpty: LuaTableIsEmptyMethod;
                set: LuaTableSetMethod<string, number>;
            }
            const table = {} as TableWithIsEmpty;
            table.set("foo", 42);
            table.set("bar", 12);

            const emptyTable = {} as TableWithIsEmpty;

            export const result = [table.isEmpty(), emptyTable.isEmpty()];
        `
            .withLanguageExtensions()
            .expectToEqual({ result: [false, true] });
    });
});

describe("Table extensions use as expression", () => {
    test.each([
        ["LuaTableAddKey<{}, string>", 'func({}, "foo")', undefined],
        ["LuaTableAddKey<{}, string>", '"truthy" && func({}, "foo")', undefined],
        ["LuaTableDelete<{}, string>", 'func({}, "foo")', true],
        ["LuaTableDelete<{}, string>", '"truthy" && func({}, "foo")', true],
        ["LuaTableSet<{}, string, number>", 'func({}, "foo", 3)', undefined],
        ["LuaTableIsEmpty<{}>", "func({})", true],
        ["LuaTableIsEmpty<{}>", 'func({ foo: "bar", baz: "baz" })', false],
        ["LuaTableIsEmpty<{}>", '"truthy" && func({})', true],
    ])("functions used as expression", (funcType, expression, value) => {
        util.testModule`
            declare const func: ${funcType}
            export const result = ${expression}
        `
            .withLanguageExtensions()
            .setReturnExport("result")
            .ignoreDiagnostics([2872 /* TS2872: This kind of expression is always truthy. */])
            .expectToEqual(value);
    });

    test.each([
        ["LuaTableDeleteMethod<string>", 'tbl.func("foo")', true],
        ["LuaTableSetMethod<string, number>", 'tbl.func("foo", 3)', undefined],
        ["LuaTableAddKeyMethod<string>", 'tbl.func("foo")', undefined],
        ["LuaTableIsEmpty<{}>", "tbl.func({})", true],
    ])("methods used as expression", (funcType, expression, value) => {
        util.testModule`
            const tbl = {} as { func: ${funcType} }
            export const result = ${expression}
        `
            .withLanguageExtensions()
            .setReturnExport("result")
            .expectToEqual(value);
    });
});

describe("LuaTable extension interface", () => {
    test("untyped table", () => {
        util.testFunction`
            const tbl = new LuaTable();
            tbl.set("foo", 3);
            return tbl.get("foo");
        `
            .withLanguageExtensions()
            .expectToEqual(3);
    });

    test("typed table", () => {
        util.testFunction`
            const tbl = new LuaTable<string, number>();
            tbl.set("foo", 3);
            return tbl.get("foo");
        `
            .withLanguageExtensions()
            .expectToEqual(3);
    });

    // Test to catch issue from https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1033
    test("typed table in type declaration", () => {
        util.testFunction`
            function fill(tbl: LuaTable<string, number>) {
                tbl.set("foo", 3);
                return tbl;
            }
            return fill(new LuaTable()).get("foo");
        `
            .withLanguageExtensions()
            .expectToEqual(3);
    });

    test.each([["null"], ["undefined"], ["number | undefined"], ["string | null"], ["unknown"]])(
        "LuaTable in strict mode does not accept key type that could be nil (%p)",
        keyType => {
            util.testExpression`new LuaTable<${keyType}, unknown>()`
                .withLanguageExtensions()
                .setOptions({ strict: true })
                .expectToHaveDiagnostics()
                .expectDiagnosticsToMatchSnapshot();
        }
    );

    test("object keyed table", () => {
        util.testFunction`
            interface Key { keyStr: string }
            const key: Key = {keyStr: "foo"};
            const tbl = new LuaTable<Key, number>();
            tbl.set(key, 3);
            return tbl.get(key);
        `
            .withLanguageExtensions()
            .expectToEqual(3);
    });

    test("table length", () => {
        util.testFunction`
            const tbl = new LuaTable<number, string>();
            tbl.set(1, "foo");
            tbl.set(3, "bar");
            return tbl.length();
        `
            .withLanguageExtensions()
            .expectToEqual(1);
    });

    test("table has", () => {
        util.testFunction`
            const tbl = new LuaTable<number, string>();
            tbl.set(3, "foo");
            return [tbl.has(1), tbl.has(3)];
        `
            .withLanguageExtensions()
            .expectToEqual([false, true]);
    });

    test("table delete", () => {
        util.testFunction`
            const tbl = new LuaTable<string, number>();
            tbl.set("foo", 1);
            tbl.set("bar", 3);
            tbl.set("baz", 5);
            tbl.delete("bar");
            tbl.delete("foo");
            return tbl;
        `
            .withLanguageExtensions()
            .expectToEqual({ baz: 5 });
    });

    test("table isEmpty", () => {
        util.testFunction`
            const tbl = new LuaTable<string, number>();
            tbl.set("foo", 1);

            const emptyTbl = new LuaTable<string, number>();

            return [tbl.isEmpty(), emptyTbl.isEmpty()];
        `
            .withLanguageExtensions()
            .expectToEqual([false, true]);
    });

    test("table add", () => {
        util.testFunction`
            const tbl = new LuaSet<string>();
            tbl.add("foo");
            return tbl
        `
            .withLanguageExtensions()
            .expectToEqual({ foo: true });
    });

    test.each(['new LuaTable().get("foo");', 'new LuaTable().set("foo", "bar");'])(
        "table immediate access (%p)",
        statement => {
            util.testFunction(statement).withLanguageExtensions().expectToHaveNoDiagnostics();
        }
    );

    test("table pairs iterate", () => {
        util.testFunction`
            const tbl = new LuaTable<string, number>();
            tbl.set("foo", 1);
            tbl.set("bar", 3);
            tbl.set("baz", 5);
            const results: Record<string, number> = {};
            for (const [k, v] of tbl) {
                results[k] = v;
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual({ foo: 1, bar: 3, baz: 5 });
    });
});

test.each([
    [undefined, undefined],
    ["new LuaSet()", true],
])("call on optional table with strictNullChecks (%s)", (value, expected) => {
    util.testFunction`
        function getFoo(): LuaSet<string> | undefined {
            return ${value}
        }
        const foo = getFoo()
        foo?.add("foo")
        return foo?.has("foo")
    `
        .setOptions({
            strictNullChecks: true,
        })
        .withLanguageExtensions()
        .expectToEqual(expected);
});

describe("does not crash on invalid extension use", () => {
    test("global function", () => {
        util.testModule`
        declare const op: LuaTableGet<{}, string, any>
        op({})
        `
            .withLanguageExtensions()
            .expectDiagnosticsToMatchSnapshot();
    });

    test("method", () => {
        util.testModule`
        const left = {} as {
            op: LuaTableGet<{}, string, any>
        }
        left.op()
        `
            .withLanguageExtensions()
            .expectDiagnosticsToMatchSnapshot();
    });
});
