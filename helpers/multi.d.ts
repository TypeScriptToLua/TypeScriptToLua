declare global {
    export type MultiReturn<T extends any[]> = T & {
        readonly " __multiBrand": unique symbol;
    };

    export function multi<T extends any[]>(...values: T): MultiReturn<T>;
}

export {};
