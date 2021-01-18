declare function $multi<T extends any[]>(...values: T): MultiReturn<T>;
declare type MultiReturn<T extends any[]> = T & { readonly " __multiBrand": unique symbol };

declare namespace tstl {
    export type OperatorAdd<A, B, R> = ((a: A, b: B) => R) & { readonly __opAddBrand: unique symbol };
    export type OperatorAddMethod<A, B, R> = ((this: A, b: B) => R) & { readonly __opAddMethodBrand: unique symbol };
}
