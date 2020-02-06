export type Tuple<T extends any[]> = T & {
    " __tupleBrand": never;
};

export declare function tuple<T extends any[]>(...values: T): Tuple<T>;
