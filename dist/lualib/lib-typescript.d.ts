declare class Set<T> {
    constructor(other?: Set<T>);
    add(item: T): void;
    contains(item: T): boolean;
    remove(item: T): boolean;
    items(): T[];
    count(): number;

    //forEach<U>((item: T) => U): U[];
}

declare class Map<S,T> {
    constructor(other?: Map<S,T>);
    put(key: S, value: T): void;
    remove(key: S): boolean;
    get(key: S): T;
    containsKey(key: S): boolean;
    keys(): S[];
    values(): T[];
    items(): {key: S, value: T}[];
    count(): number;
}