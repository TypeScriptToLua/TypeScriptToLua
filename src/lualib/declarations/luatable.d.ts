/** @LuaTable */
declare class LuaTable<K, V> {
    public readonly length: number;
    public set(key: K, value: V): void;
    public get(key: K): V | undefined;
}
