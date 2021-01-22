declare function $multi<T extends any[]>(...values: T): MultiReturn<T>;
declare type MultiReturn<T extends any[]> = T & { readonly " __multiBrand": unique symbol };

declare type LuaAdd<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaAddBrand: unique symbol };
declare type LuaAddMethod<T, TR> = ((b: T) => TR) & { readonly __luaAddMethodBrand: unique symbol };

declare type LuaLen<T, TR> = ((obj: T) => TR) & { readonly __luaLenBrand: unique symbol };
declare type LuaLenMethod<TR> = (() => TR) & { readonly __luaLenMethodBrand: unique symbol };
