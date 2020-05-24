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
    util.testModule(tableLib + "const table = new Table(true);").expectDiagnosticsToMatchSnapshot([
        luaTableForbiddenUsage.code,
    ]);
});

test.each([tableLibClass, tableLibInterface])(
    "LuaTable set() cannot be used in a LuaTable call expression",
    tableLib => {
        util.testModule(tableLib + 'const exp = tbl.set("value", 5)').expectDiagnosticsToMatchSnapshot([
            unsupportedProperty.code,
        ]);
    }
);

test.each([tableLibClass, tableLibInterface])("LuaTables cannot have other members", tableLib => {
    util.testModule(tableLib + "tbl.other()").expectDiagnosticsToMatchSnapshot([unsupportedProperty.code]);
});

test.each([tableLibClass, tableLibInterface])("LuaTables cannot have other members", tableLib => {
    util.testModule(tableLib + "let x = tbl.other()").expectDiagnosticsToMatchSnapshot([unsupportedProperty.code]);
});

test.each([tableLibClass])("LuaTable new", tableLib => {
    const content = tableLib + "tbl = new Table();";
    expect(util.transpileString(content)).toEqual("tbl = {}");
});

test.each([tableLibClass])("LuaTable length", tableLib => {
    const content = tableLib + "tbl = new Table();\nreturn tbl.length;";
    const lua = util.transpileString(content);
    expect(util.executeLua(lua)).toEqual(0);
});

test.each([tableLibClass, tableLibInterface])("Cannot set LuaTable length", tableLib => {
    util.testModule(tableLib + "tbl.length = 2;").expectDiagnosticsToMatchSnapshot([luaTableForbiddenUsage.code]);
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
        util.testModule(tableLib + invalidCode).expectDiagnosticsToMatchSnapshot([luaTableForbiddenUsage.code]);
    });
});

test.each([tableLibClass])("Cannot extend LuaTable class", tableLib => {
    test.each(["class Ext extends Table {}", "const c = class Ext extends Table {}"])(
        "Cannot extend LuaTable class (%p)",
        code => {
            util.testModule(tableLib + code).expectDiagnosticsToMatchSnapshot([luaTableCannotBeExtended.code]);
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
        util.testModule(tableLib + code).expectDiagnosticsToMatchSnapshot([luaTableInvalidInstanceOf.code]);
    });
});

test.each([tableLibClass, tableLibInterface])("Cannot use ElementAccessExpression on a LuaTable", tableLib => {
    test.each(['tbl["get"]("field")', 'tbl["set"]("field")', 'tbl["length"]'])(
        "Cannot use ElementAccessExpression on a LuaTable (%p)",
        code => {
            util.testModule(tableLib + code).expectDiagnosticsToMatchSnapshot([
                luaTableCannotBeAccessedDynamically.code,
            ]);
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
    ])("LuaTable test (%p)", (code, expectedReturnValue) => {
        expect(util.transpileAndExecute(code, undefined, undefined, tableLib)).toBe(expectedReturnValue);
    });
});
