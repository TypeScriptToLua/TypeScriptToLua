import {
    luaTableCannotBeAccessedDynamically,
    luaTableCannotBeExtended,
    luaTableForbiddenUsage,
    luaTableMustBeAmbient,
    unsupportedProperty,
    luaTableInvalidInstanceOf,
} from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

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

const tableLibInterface = `
/** @luaTable */
declare interface Table<K extends {} = {}, V = any> {
    length: number;
    set(key?: K, value?: V, notAllowed?: any): void;
    get(key?: K, notAllowed?: any): V;
    other(): void;
}

/** @luaTable */
declare const Table: new <K extends {} = {}, V = any>(notAllowed?: any) => Table<K, V>;
declare let tbl: Table;
`;

test.each([tableLibClass])("LuaTables cannot be constructed with arguments", tableLib => {
    util.testModule("const table = new Table(true);")
        .setTsHeader(tableLib)
        .expectDiagnosticsToMatchSnapshot([luaTableForbiddenUsage.code]);
});

test.each([tableLibClass, tableLibInterface])(
    "LuaTable set() cannot be used in a LuaTable call expression",
    tableLib => {
        util.testModule('const exp = tbl.set("value", 5)')
            .setTsHeader(tableLib)
            .expectDiagnosticsToMatchSnapshot([unsupportedProperty.code]);
    }
);

test.each([tableLibClass, tableLibInterface])("LuaTables cannot have other members", tableLib => {
    util.testModule("tbl.other()").setTsHeader(tableLib).expectDiagnosticsToMatchSnapshot([unsupportedProperty.code]);
});

test.each([tableLibClass, tableLibInterface])("LuaTables cannot have other members", tableLib => {
    util.testModule("let x = tbl.other()")
        .setTsHeader(tableLib)
        .expectDiagnosticsToMatchSnapshot([unsupportedProperty.code]);
});

test.each([tableLibClass])("LuaTable new", tableLib => {
    expect(util.testFunction("tbl = new Table();").setTsHeader(tableLib).getMainLuaCodeChunk()).toContain("tbl = {}");
});

test.each([tableLibClass])("LuaTable length", tableLib => {
    util.testFunction`
        tbl = new Table();
        return tbl.length;
    `
        .setTsHeader(tableLib)
        .expectToEqual(0);
});

test.each([tableLibClass, tableLibInterface])("Cannot set LuaTable length", tableLib => {
    util.testModule("tbl.length = 2;")
        .setTsHeader(tableLib)
        .expectDiagnosticsToMatchSnapshot([luaTableForbiddenUsage.code]);
});

test.each([tableLibClass, tableLibInterface])("Forbidden LuaTable use", tableLib => {
    test.each([
        "tbl.get()",
        'tbl.get("field", "field2")',
        "tbl.set()",
        'tbl.set("field")',
        'tbl.set("field", 0, 1)',
        'tbl.set(...(["field", 0] as const))',
        'tbl.set("field", ...([0] as const))',
    ])("Forbidden LuaTable use (%p)", invalidCode => {
        util.testModule(invalidCode)
            .setTsHeader(tableLib)
            .expectDiagnosticsToMatchSnapshot([luaTableForbiddenUsage.code]);
    });
});

test.each([tableLibClass])("Cannot extend LuaTable class", tableLib => {
    test.each(["class Ext extends Table {}", "const c = class Ext extends Table {}"])(
        "Cannot extend LuaTable class (%p)",
        code => {
            util.testModule(code)
                .setTsHeader(tableLib)
                .expectDiagnosticsToMatchSnapshot([luaTableCannotBeExtended.code]);
        }
    );
});

test.each([
    "/** @luaTable */ class Table {}",
    "/** @luaTable */ export class Table {}",
    "/** @luaTable */ const c = class Table {}",
])("LuaTable classes must be ambient (%p)", code => {
    util.testModule(code).expectDiagnosticsToMatchSnapshot([luaTableMustBeAmbient.code]);
});

test.each([tableLibClass])("Cannot extend LuaTable class", tableLib => {
    test.each(["tbl instanceof Table"])("Cannot use instanceof on a LuaTable class (%p)", code => {
        util.testModule(code).setTsHeader(tableLib).expectDiagnosticsToMatchSnapshot([luaTableInvalidInstanceOf.code]);
    });
});

test.each([tableLibClass, tableLibInterface])("Cannot use ElementAccessExpression on a LuaTable", tableLib => {
    test.each(['tbl["get"]("field")', 'tbl["set"]("field")', 'tbl["length"]'])(
        "Cannot use ElementAccessExpression on a LuaTable (%p)",
        code => {
            util.testModule(code)
                .setTsHeader(tableLib)
                .expectDiagnosticsToMatchSnapshot([luaTableCannotBeAccessedDynamically.code]);
        }
    );
});

test.each([tableLibClass, tableLibInterface])("Cannot isolate LuaTable methods", tableLib => {
    test.each(["set", "get"])("Cannot isolate LuaTable method (%p)", propertyName => {
        util.testModule(`${tableLib} let property = tbl.${propertyName}`).expectDiagnosticsToMatchSnapshot([
            unsupportedProperty.code,
        ]);
    });
});

test.each([tableLibClass])("LuaTable functional tests", tableLib => {
    test.each<[string, any]>([
        ['const t = new Table(); t.set("field", "value"); return t.get("field");', "value"],
        ['const t = new Table(); t.set("field", 0); return t.get("field");', 0],
        ["const t = new Table(); t.set(1, true); return t.length", 1],
        ["const t = new Table(); t.set(t.length + 1, true); t.set(t.length + 1, true); return t.length", 2],
        ['const k = "k"; const t = { data: new Table() }; t.data.set(k, 3); return t.data.get(k);', 3],
        ['const t = new Table(); t.set("foo", "bar"); return t.has("foo");', "bar"],
    ])("LuaTable test (%p)", (code, expectedReturnValue) => {
        util.testFunction(code).setTsHeader(tableLib).expectToEqual(expectedReturnValue);
    });
});
