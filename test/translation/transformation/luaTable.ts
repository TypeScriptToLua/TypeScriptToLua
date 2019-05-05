/** @luaTable */
declare class Table<K extends {} = {}, V = any> {
    public readonly length: number;
    public set(key: K, value: V): void;
    public get(key: K): V;
}
declare let tbl: Table;
tbl = new Table();
tbl.set("value", 5);
const value = tbl.get("value");
const tblLength = tbl.length;

/** @luaTable */
declare interface InterfaceTable<K extends {} = {}, V = any> {
    readonly length: number;
    set(key: K, value: V): void;
    get(key: K): V;
}

declare const itbl: InterfaceTable;
itbl.set("value", 5);
const ivalue = itbl.get("value");
const ilength = tbl.length;
