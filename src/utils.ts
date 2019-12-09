import * as path from "path";

export const normalizeSlashes = (filePath: string) => filePath.replace(/\\/g, "/");
export const trimExtension = (filePath: string) => filePath.slice(0, -path.extname(filePath).length);

export function formatPathToLuaPath(filePath: string): string {
    filePath = filePath.replace(/\.json$/, "");
    if (process.platform === "win32") {
        // Windows can use backslashes
        filePath = filePath.replace(/\.\\/g, "").replace(/\\/g, ".");
    }
    return filePath.replace(/\.\//g, "").replace(/\//g, ".");
}

type NoInfer<T> = [T][T extends any ? 0 : never];

export function getOrUpdate<K, V>(
    map: Map<K, V> | (K extends object ? WeakMap<K, V> : never),
    key: K,
    getDefaultValue: () => NoInfer<V>
): V {
    if (!map.has(key)) {
        map.set(key, getDefaultValue());
    }

    return map.get(key)!;
}

export function isNonNull<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}

export function cast<TOriginal, TCast extends TOriginal>(
    item: TOriginal,
    cast: (item: TOriginal) => item is TCast
): TCast {
    if (cast(item)) {
        return item;
    } else {
        throw new Error(`Failed to cast value to expected type using ${cast.name}.`);
    }
}

export function castEach<TOriginal, TCast extends TOriginal>(
    items: TOriginal[],
    cast: (item: TOriginal) => item is TCast
): TCast[] {
    if (items.every(cast)) {
        return items as TCast[];
    } else {
        throw new Error(`Failed to cast all elements to expected type using ${cast.name}.`);
    }
}

export function assertNever(_value: never): never {
    throw new Error("Value is expected to be never");
}

export function assume<T>(_value: any): asserts _value is T {}
