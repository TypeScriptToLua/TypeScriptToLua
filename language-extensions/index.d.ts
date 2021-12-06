type AnyTable = Record<any, any>;
// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/consistent-type-definitions
type AnyNotNil = {};

/**
 * Indicates a type is a language extension provided by TypescriptToLua.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TBrand A string used to uniquely identify the language extension type
 */
declare type LuaExtension<TBrand extends string> = { [T in TBrand]: { readonly __luaExtensionSymbol: unique symbol } };

/**
 * Returns multiple values from a function, by wrapping them in a LuaMultiReturn tuple.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param T A tuple type with each element type representing a return value's type.
 * @param values Return values.
 */
declare const $multi: (<T extends any[]>(...values: T) => LuaMultiReturn<T>) & LuaExtension<"__luaMultiFunctionBrand">;

/**
 * Represents multiple return values as a tuple.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param T A tuple type with each element type representing a return value's type.
 */
declare type LuaMultiReturn<T extends any[]> = T & LuaExtension<"__luaMultiReturnBrand">;

/**
 * Creates a Lua-style numeric for loop (for i=start,limit,step) when used in for...of. Not valid in any other context.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param start The first number in the sequence to iterate over.
 * @param limit The last number in the sequence to iterate over.
 * @param step The amount to increment each iteration.
 */
declare const $range: ((start: number, limit: number, step?: number) => Iterable<number>) &
    LuaExtension<"__luaRangeFunctionBrand">;

/**
 * Transpiles to the global vararg (`...`)
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 */
declare const $vararg: string[] & LuaExtension<"__luaVarargConstantBrand">;

/**
 * Represents a Lua-style iterator which is returned from a LuaIterable.
 * For simple iterators (with no state), this is just a function.
 * For complex iterators that use a state, this is a LuaMultiReturn tuple containing a function, the state, and the initial value to pass to the function.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param state The state object returned from the LuaIterable.
 * @param lastValue The last value returned from this function. If iterating LuaMultiReturn values, this is the first value of the tuple.
 */
declare type LuaIterator<TValue, TState> = TState extends undefined
    ? (this: void) => TValue
    : LuaMultiReturn<
          [
              (
                  this: void,
                  state: TState,
                  lastValue: TValue extends LuaMultiReturn<infer TTuple> ? TTuple[0] : TValue
              ) => TValue,
              TState,
              TValue extends LuaMultiReturn<infer TTuple> ? TTuple[0] : TValue
          ]
      >;

/**
 * Represents a Lua-style iteratable which iterates single values in a `for...in` loop (ex. `for x in iter() do`).
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TValue The type of value returned each iteration. If this is LuaMultiReturn, multiple values will be returned each iteration.
 * @param TState The type of the state value passed back to the iterator function each iteration.
 */
declare type LuaIterable<TValue, TState = undefined> = Iterable<TValue> &
    LuaIterator<TValue, TState> &
    LuaExtension<"__luaIterableBrand">;

/**
 * Represents an object that can be iterated with pairs()
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key returned each iteration.
 * @param TValue The type of the value returned each iteration.
 */
declare type LuaPairsIterable<TKey extends AnyNotNil, TValue> = Iterable<[TKey, TValue]> &
    LuaExtension<"__luaPairsIterableBrand">;

/**
 * Calls to functions with this type are translated to `left + right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaAddition<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaAdditionBrand">;

/**
 * Calls to methods with this type are translated to `left + right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaAdditionMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaAdditionMethodBrand">;

/**
 * Calls to functions with this type are translated to `left - right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaSubtraction<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaSubtractionBrand">;

/**
 * Calls to methods with this type are translated to `left - right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaSubtractionMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaSubtractionMethodBrand">;

/**
 * Calls to functions with this type are translated to `left * right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaMultiplication<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaMultiplicationBrand">;

/**
 * Calls to methods with this type are translated to `left * right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaMultiplicationMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaMultiplicationMethodBrand">;

/**
 * Calls to functions with this type are translated to `left / right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaDivision<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaDivisionBrand">;

/**
 * Calls to methods with this type are translated to `left / right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaDivisionMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaDivisionMethodBrand">;

/**
 * Calls to functions with this type are translated to `left % right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaModulo<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaModuloBrand">;

/**
 * Calls to methods with this type are translated to `left % right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaModuloMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"__luaModuloMethodBrand">;

/**
 * Calls to functions with this type are translated to `left ^ right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaPower<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaPowerBrand">;

/**
 * Calls to methods with this type are translated to `left ^ right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaPowerMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"__luaPowerMethodBrand">;

/**
 * Calls to functions with this type are translated to `left // right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaFloorDivision<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaFloorDivisionBrand">;

/**
 * Calls to methods with this type are translated to `left // right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaFloorDivisionMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaFloorDivisionMethodBrand">;

/**
 * Calls to functions with this type are translated to `left & right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseAnd<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseAndBrand">;

/**
 * Calls to methods with this type are translated to `left & right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseAndMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseAndMethodBrand">;

/**
 * Calls to functions with this type are translated to `left | right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseOr<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseOrBrand">;

/**
 * Calls to methods with this type are translated to `left | right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseOrMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseOrMethodBrand">;

/**
 * Calls to functions with this type are translated to `left ~ right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseExclusiveOr<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseExclusiveOrBrand">;

/**
 * Calls to methods with this type are translated to `left ~ right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseExclusiveOrMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseExclusiveOrMethodBrand">;

/**
 * Calls to functions with this type are translated to `left << right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseLeftShift<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseLeftShiftBrand">;

/**
 * Calls to methods with this type are translated to `left << right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseLeftShiftMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseLeftShiftMethodBrand">;

/**
 * Calls to functions with this type are translated to `left >> right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseRightShift<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseRightShiftBrand">;

/**
 * Calls to methods with this type are translated to `left >> right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseRightShiftMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaBitwiseRightShiftMethodBrand">;

/**
 * Calls to functions with this type are translated to `left .. right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaConcat<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaConcatBrand">;

/**
 * Calls to methods with this type are translated to `left .. right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaConcatMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"__luaConcatMethodBrand">;

/**
 * Calls to functions with this type are translated to `left < right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLessThan<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaLessThanBrand">;

/**
 * Calls to methods with this type are translated to `left < right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLessThanMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaLessThanMethodBrand">;

/**
 * Calls to functions with this type are translated to `left > right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaGreaterThan<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"__luaGreaterThanBrand">;

/**
 * Calls to methods with this type are translated to `left > right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaGreaterThanMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"__luaGreaterThanMethodBrand">;

/**
 * Calls to functions with this type are translated to `-operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaNegation<TOperand, TReturn> = ((operand: TOperand) => TReturn) & LuaExtension<"__luaNegationBrand">;

/**
 * Calls to method with this type are translated to `-operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaNegationMethod<TReturn> = (() => TReturn) & LuaExtension<"__luaNegationMethodBrand">;

/**
 * Calls to functions with this type are translated to `~operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseNot<TOperand, TReturn> = ((operand: TOperand) => TReturn) & LuaExtension<"__luaBitwiseNotBrand">;

/**
 * Calls to method with this type are translated to `~operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseNotMethod<TReturn> = (() => TReturn) & LuaExtension<"__luaBitwiseNotMethodBrand">;

/**
 * Calls to functions with this type are translated to `#operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLength<TOperand, TReturn> = ((operand: TOperand) => TReturn) & LuaExtension<"__luaLengthBrand">;

/**
 * Calls to method with this type are translated to `#operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLengthMethod<TReturn> = (() => TReturn) & LuaExtension<"__luaLengthMethodBrand">;

/**
 * Calls to functions with this type are translated to `table[key]`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TTable The type to access as a Lua table.
 * @param TKey The type of the key to use to access the table.
 * @param TValue The type of the value stored in the table.
 */
declare type LuaTableGet<TTable extends AnyTable, TKey extends AnyNotNil, TValue> = ((
    table: TTable,
    key: TKey
) => TValue) &
    LuaExtension<"__luaTableGetBrand">;

/**
 * Calls to methods with this type are translated to `table[key]`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 * @param TValue The type of the value stored in the table.
 */
declare type LuaTableGetMethod<TKey extends AnyNotNil, TValue> = ((key: TKey) => TValue) &
    LuaExtension<"__luaTableGetMethodBrand">;

/**
 * Calls to functions with this type are translated to `table[key] = value`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TTable The type to access as a Lua table.
 * @param TKey The type of the key to use to access the table.
 * @param TValue The type of the value to assign to the table.
 */
declare type LuaTableSet<TTable extends AnyTable, TKey extends AnyNotNil, TValue> = ((
    table: TTable,
    key: TKey,
    value: TValue
) => void) &
    LuaExtension<"__luaTableSetBrand">;

/**
 * Calls to methods with this type are translated to `table[key] = value`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 * @param TValue The type of the value to assign to the table.
 */
declare type LuaTableSetMethod<TKey extends AnyNotNil, TValue> = ((key: TKey, value: TValue) => void) &
    LuaExtension<"__luaTableSetMethodBrand">;

/**
 * Calls to functions with this type are translated to `table[key] ~= nil`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TTable The type to access as a Lua table.
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableHas<TTable extends AnyTable, TKey extends AnyNotNil> = ((table: TTable, key: TKey) => boolean) &
    LuaExtension<"__luaTableHasBrand">;

/**
 * Calls to methods with this type are translated to `table[key] ~= nil`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableHasMethod<TKey extends AnyNotNil> = ((key: TKey) => boolean) &
    LuaExtension<"__luaTableHasMethodBrand">;

/**
 * Calls to functions with this type are translated to `table[key] = nil`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TTable The type to access as a Lua table.
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableDelete<TTable extends AnyTable, TKey extends AnyNotNil> = ((table: TTable, key: TKey) => boolean) &
    LuaExtension<"__luaTableDeleteBrand">;

/**
 * Calls to methods with this type are translated to `table[key] = nil`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableDeleteMethod<TKey extends AnyNotNil> = ((key: TKey) => boolean) &
    LuaExtension<"__luaTableDeleteMethodBrand">;

/**
 * A convenience type for working directly with a Lua table.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the keys used to access the table.
 * @param TValue The type of the values stored in the table.
 */
declare interface LuaTable<TKey extends AnyNotNil = AnyNotNil, TValue = any> extends LuaPairsIterable<TKey, TValue> {
    length: LuaLengthMethod<number>;
    get: LuaTableGetMethod<TKey, TValue>;
    set: LuaTableSetMethod<TKey, TValue>;
    has: LuaTableHasMethod<TKey>;
    delete: LuaTableDeleteMethod<TKey>;
}

/**
 * A convenience type for working directly with a Lua table.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the keys used to access the table.
 * @param TValue The type of the values stored in the table.
 */
declare type LuaTableConstructor = (new <TKey extends AnyNotNil = AnyNotNil, TValue = any>() => LuaTable<
    TKey,
    TValue
>) &
    LuaExtension<"__luaTableNewBrand">;

/**
 * A convenience type for working directly with a Lua table.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the keys used to access the table.
 * @param TValue The type of the values stored in the table.
 */
declare const LuaTable: LuaTableConstructor;
