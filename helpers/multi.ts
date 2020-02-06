export type MultiReturn<T extends any[]> = T & {
    " __multiBrand": never;
};

export declare function multi<T extends any[]>(...values: T): MultiReturn<T>;
