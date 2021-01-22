declare function $multi<T extends any[]>(...values: T): MultiReturn<T>;
declare type MultiReturn<T extends any[]> = T & { readonly " __multiBrand": unique symbol };

declare type LuaAdd<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaAddBrand: unique symbol };
declare type LuaAddMethod<T, TR> = ((b: T) => TR) & { readonly __luaAddMethodBrand: unique symbol };

declare type LuaSub<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaSubBrand: unique symbol };
declare type LuaSubMethod<T, TR> = ((b: T) => TR) & { readonly __luaSubMethodBrand: unique symbol };

declare type LuaMul<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaMulBrand: unique symbol };
declare type LuaMulMethod<T, TR> = ((b: T) => TR) & { readonly __luaMulMethodBrand: unique symbol };

declare type LuaDiv<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaDivBrand: unique symbol };
declare type LuaDivMethod<T, TR> = ((b: T) => TR) & { readonly __luaDivMethodBrand: unique symbol };

declare type LuaMod<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaModBrand: unique symbol };
declare type LuaModMethod<T, TR> = ((b: T) => TR) & { readonly __luaModMethodBrand: unique symbol };

declare type LuaPow<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaPowBrand: unique symbol };
declare type LuaPowMethod<T, TR> = ((b: T) => TR) & { readonly __luaPowMethodBrand: unique symbol };

declare type LuaIdiv<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaIdivBrand: unique symbol };
declare type LuaIdivMethod<T, TR> = ((b: T) => TR) & { readonly __luaIdivMethodBrand: unique symbol };

declare type LuaBand<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaBandBrand: unique symbol };
declare type LuaBandMethod<T, TR> = ((b: T) => TR) & { readonly __luaBandMethodBrand: unique symbol };

declare type LuaBor<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaBorBrand: unique symbol };
declare type LuaBorMethod<T, TR> = ((b: T) => TR) & { readonly __luaBorMethodBrand: unique symbol };

declare type LuaBxor<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaBxorBrand: unique symbol };
declare type LuaBxorMethod<T, TR> = ((b: T) => TR) & { readonly __luaBxorMethodBrand: unique symbol };

declare type LuaShl<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaShlBrand: unique symbol };
declare type LuaShlMethod<T, TR> = ((b: T) => TR) & { readonly __luaShlMethodBrand: unique symbol };

declare type LuaShr<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaShrBrand: unique symbol };
declare type LuaShrMethod<T, TR> = ((b: T) => TR) & { readonly __luaShrMethodBrand: unique symbol };

declare type LuaConcat<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaConcatBrand: unique symbol };
declare type LuaConcatMethod<T, TR> = ((b: T) => TR) & { readonly __luaConcatMethodBrand: unique symbol };

declare type LuaLt<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaLtBrand: unique symbol };
declare type LuaLtMethod<T, TR> = ((b: T) => TR) & { readonly __luaLtMethodBrand: unique symbol };

declare type LuaGt<TA, TB, TR> = ((a: TA, b: TB) => TR) & { readonly __luaGtBrand: unique symbol };
declare type LuaGtMethod<T, TR> = ((b: T) => TR) & { readonly __luaGtMethodBrand: unique symbol };

declare type LuaUnm<T, TR> = ((obj: T) => TR) & { readonly __luaUnmBrand: unique symbol };
declare type LuaUnmMethod<TR> = (() => TR) & { readonly __luaUnmMethodBrand: unique symbol };

declare type LuaBnot<T, TR> = ((obj: T) => TR) & { readonly __luaBnotBrand: unique symbol };
declare type LuaBnotMethod<TR> = (() => TR) & { readonly __luaBnotMethodBrand: unique symbol };

declare type LuaLen<T, TR> = ((obj: T) => TR) & { readonly __luaLenBrand: unique symbol };
declare type LuaLenMethod<TR> = (() => TR) & { readonly __luaLenMethodBrand: unique symbol };
