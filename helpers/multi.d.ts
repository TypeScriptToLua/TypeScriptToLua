export type MultiReturn<T extends any[]> = T & {
    readonly " __multiBrand": unique symbol;
};

export { MultiReturn as MR };

export declare function multi<T extends any[]>(...values: T): MultiReturn<T>;
