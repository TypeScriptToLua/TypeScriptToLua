/** @LuaTable */
declare class Table<K extends {} = {}, V = any> {
    public readonly length: number;
    public set(key: K, value: V): void;
    public get(key: K): V;
    public other(): void;
}
declare let tbl: Table;
tbl = new Table();
tbl.set("value", 5);
const value = tbl.get("value");
const tblLength = tbl.length;
