import {
    ForbiddenLuaTableNonDeclaration,
    ForbiddenLuaTableSetExpression,
    ForbiddenLuaTableUseException,
    InvalidExtendsLuaTable,
    InvalidInstanceOfLuaTable,
} from "../../../src/transformation/utils/errors";
import * as util from "../../util";

const tableLibClass = `
/** @luaTable */
declare class Table<K extends {} = {}, V = any> {
    length: number;
    constructor(notAllowed?: boolean);
    set(key?: K, value?: V): void;
    get(key?: K): V;
    other(): void;
}
declare let tbl: Table;
`;

const tableLibInterface = `
/** @luaTable */
declare interface Table<K extends {} = {}, V = any> {
    length: number;
    constructor(notAllowed?: boolean);
    set(key?: K, value?: V): void;
    get(key?: K): V;
    other(): void;
}
declare let tbl: Table;
`;

test.each([tableLibClass])("LuaTables cannot be constructed with arguments", tableLib => {
    expect(() => util.transpileString(tableLib + `const table = new Table(true);`)).toThrowExactError(
        ForbiddenLuaTableUseException("No parameters are allowed when constructing a LuaTable object.", util.nodeStub)
    );
});

test.each([tableLibClass, tableLibInterface])("LuaTable set() cannot be used in an expression position", tableLib => {
    expect(() => util.transpileString(tableLib + `const exp = tbl.set("value", 5)`)).toThrowExactError(
        ForbiddenLuaTableSetExpression(util.nodeStub)
    );
});

test.each([tableLibClass, tableLibInterface])("LuaTables cannot have other methods", tableLib => {
    expect(() => util.transpileString(tableLib + `tbl.other()`)).toThrowExactError(
        ForbiddenLuaTableUseException("Unsupported method.", util.nodeStub)
    );
});

test.each([tableLibClass, tableLibInterface])("LuaTables cannot have other methods", tableLib => {
    expect(() => util.transpileString(tableLib + `let x = tbl.other()`)).toThrowExactError(
        ForbiddenLuaTableUseException("Unsupported method.", util.nodeStub)
    );
});

test.each([tableLibClass])("LuaTable new", tableLib => {
    const content = tableLib + `tbl = new Table();`;
    expect(util.transpileString(content)).toEqual("tbl = {}");
});

test.each([tableLibClass])("LuaTable length", tableLib => {
    const content = tableLib + `tbl = new Table();\nreturn tbl.length;`;
    const lua = util.transpileString(content);
    expect(util.executeLua(lua)).toEqual(0);
});

test.each([tableLibClass, tableLibInterface])("Cannot set LuaTable length", tableLib => {
    expect(() => util.transpileString(tableLib + `tbl.length = 2;`)).toThrowExactError(
        ForbiddenLuaTableUseException("A LuaTable object's length cannot be re-assigned.", util.nodeStub)
    );
});

test.each([tableLibClass, tableLibInterface])("Forbidden LuaTable use", tableLib => {
    test.each([
        [`tbl.get()`, "One parameter is required for get()."],
        [`tbl.get("field", "field2")`, "One parameter is required for get()."],
        [`tbl.set()`, "Two parameters are required for set()."],
        [`tbl.set("field")`, "Two parameters are required for set()."],
        [`tbl.set("field", 0, 1)`, "Two parameters are required for set()."],
        [`tbl.set("field", ...[0, 1])`, "Arguments cannot be spread."],
    ])("Forbidden LuaTable use (%p)", (invalidCode, errorDescription) => {
        expect(() => util.transpileString(tableLib + invalidCode)).toThrowExactError(
            ForbiddenLuaTableUseException(errorDescription, util.nodeStub)
        );
    });
});

test.each([tableLibClass])("Cannot extend LuaTable class", tableLib => {
    test.each([`class Ext extends Table {}`, `const c = class Ext extends Table {}`])(
        "Cannot extend LuaTable class (%p)",
        code => {
            expect(() => util.transpileString(tableLib + code)).toThrowExactError(
                InvalidExtendsLuaTable(util.nodeStub)
            );
        }
    );
});

test.each([
    `/** @luaTable */ class Table {}`,
    `/** @luaTable */ export class Table {}`,
    `/** @luaTable */ const c = class Table {}`,
])("LuaTable classes must be ambient (%p)", code => {
    expect(() => util.transpileString(code)).toThrowExactError(ForbiddenLuaTableNonDeclaration(util.nodeStub));
});

test.each([tableLibClass])("Cannot extend LuaTable class", tableLib => {
    test.each([`tbl instanceof Table`])("Cannot use instanceof on a LuaTable class (%p)", code => {
        expect(() => util.transpileString(tableLib + code)).toThrowExactError(InvalidInstanceOfLuaTable(util.nodeStub));
    });
});

test.each([tableLibClass])("LuaTable functional tests", tableLib => {
    test.each<[string, any]>([
        [`const t = new Table(); t.set("field", "value"); return t.get("field");`, "value"],
        [`const t = new Table(); t.set("field", 0); return t.get("field");`, 0],
        [`const t = new Table(); t.set(1, true); return t.length`, 1],
        [`const t = new Table(); t.set(t.length + 1, true); t.set(t.length + 1, true); return t.length`, 2],
    ])("LuaTable test (%p)", (code, expectedReturnValue) => {
        expect(util.transpileAndExecute(code, undefined, undefined, tableLib)).toBe(expectedReturnValue);
    });
});
