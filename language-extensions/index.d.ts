declare function $multi<T extends any[]>(...values: T): MultiReturn<T>;
declare type MultiReturn<T extends any[]> = T & { readonly " __multiBrand": unique symbol };
