import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

const tableLib = `
/** @LuaTable */
declare class Table<K extends {} = {}, V = any> {
    public readonly length: number;
    public set(key: K, value: V): void;
    public get(key: K): V;
    public other(): void;
}
declare let tbl: Table;
`;

test("LuaTable set() cannot be used in an expression position", exportStatement => {
    expect(() => util.transpileString(tableLib + `const exp = tbl.set("value", 5)`)).toThrowExactError(
        TSTLErrors.ForbiddenLuaTableSetExpression(util.nodeStub),
    );
});

test.each([
    [`tbl.get()`, "A parameter is required for set() or get() on a '@LuaTable' object."],
    [`tbl.set()`, "Two parameters are required for set() on a '@LuaTable' object."],
])("Invalid LuaTable use (%p)", ([invalidCode, errorDescription]) => {
    expect(() => util.transpileString(invalidCode)).toThrowExactError(
        TSTLErrors.ForbiddenLuaTableUseException(util.nodeStub, errorDescription),
    );
});
