/** @noSelfInFile */

// TODO: TS3.4: typeof globalThis
declare const _G: {
    // Required?
    __TS__originalTraceback(this: void, thread?: any, message?: string, level?: number): string;
    [key: string]: any;
};

declare function tonumber(value: any, base?: number): number | undefined;
declare function type(
    value: any
): "nil" | "number" | "string" | "boolean" | "table" | "function" | "thread" | "userdata";
declare function setmetatable<T extends object>(table: T, metatable: any): T;
declare function rawget<T, K extends keyof T>(table: T, key: K): T[K];
declare function rawset<T, K extends keyof T>(table: T, key: K, val: T[K]): void;
/** @tupleReturn */
declare function next<K, V>(table: Record<any, V>, index?: K): [K, V];
declare function pcall(func: () => any): any;
declare function unpack<T>(list: T[], i?: number, j?: number): T[];
