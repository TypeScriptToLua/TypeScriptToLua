/** @LuaTable */
declare class LuaTable<K extends {}, V> {
    public readonly length: number;
    public set(key: K, value: V | undefined): void;
    public get(key: K): V | undefined;
}
