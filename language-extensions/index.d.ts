/**
 * Returns multiple values from a function, by wrapping them in a LuaMultiReturn tuple.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param T A tuple type with each element type representing a return value's type.
 * @param values Return values.
 */
declare const $multi: (<T extends any[]>(...values: T) => LuaMultiReturn<T>) & {
    readonly __luaMultiFunctionBrand: unique symbol;
};

/**
 * Represents multiple return values as a tuple.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param T A tuple type with each element type representing a return value's type.
 */
declare type LuaMultiReturn<T extends any[]> = T & { readonly __luaMultiReturnBrand: unique symbol };

/**
 * Creates a Lua-style numeric for loop (for i=start,limit,step) when used in for...of. Not valid in any other context.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param start The first number in the sequence to iterate over.
 * @param limit The last number in the sequence to iterate over.
 * @param step The amount to increment each iteration.
 */
declare const $range: ((start: number, limit: number, step?: number) => Iterable<number>) & {
    readonly __luaRangeFunctionBrand: unique symbol;
};

/**
 * Represents a Lua-style iterator function which is returned from a LuaIterable.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param state The state object returned from the LuaIterable.
 * @param lastValue The last value returned from this function. If iterating LuaMultiReturn values, this is the first value of the tuple.
 */
declare type LuaIterator<TValue, TState> = TState extends undefined
    ? (this: void) => TValue
    : (
          this: void,
          state: TState,
          lastValue: TValue extends LuaMultiReturn<infer TTuple> ? TTuple[0] : TValue
      ) => TValue;

/**
 * Represents a Lua-style iteratable which iterates single values in a `for...in` loop (ex. `for x in iter() do`).
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TValue The type of value returned each iteration. If this is LuaMultiReturn, multiple values will be returned each iteration.
 * @param TState The type of the state value passed back to the iterator function each iteration.
 */
declare type LuaIterable<TValue, TState = undefined> = Iterable<TValue> &
    LuaMultiReturn<
        [LuaIterator<TValue, TState>, TState, TValue extends LuaMultiReturn<infer TTuple> ? TTuple[0] : TValue]
    > & { readonly __luaIterableBrand: unique symbol };

/**
 * Calls to functions with this type are translated to `left + right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaAddition<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaAdditionBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left + right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaAdditionMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaAdditionMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left - right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaSubtraction<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaSubtractionBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left - right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaSubtractionMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaSubtractionMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left * right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaMultiplication<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaMultiplicationBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left * right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaMultiplicationMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaMultiplicationMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left / right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaDivision<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaDivisionBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left / right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaDivisionMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaDivisionMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left % right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaModulo<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaModuloBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left % right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaModuloMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaModuloMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left ^ right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaPower<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaPowerBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left ^ right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaPowerMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaPowerMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left // right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaFloorDivision<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaFloorDivisionBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left // right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaFloorDivisionMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaFloorDivisionMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left & right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseAnd<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaBitwiseAndBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left & right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseAndMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaBitwiseAndMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left | right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseOr<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaBitwiseOrBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left | right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseOrMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaBitwiseOrMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left ~ right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseExclusiveOr<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaBitwiseExclusiveOrBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left ~ right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseExclusiveOrMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaBitwiseExclusiveOrMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left << right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseLeftShift<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaBitwiseLeftShiftBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left << right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseLeftShiftMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaBitwiseLeftShiftMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left >> right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseRightShift<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaBitwiseRightShiftBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left >> right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseRightShiftMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaBitwiseRightShiftMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left .. right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaConcat<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaConcatBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left .. right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaConcatMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaConcatMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left < right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLessThan<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaLessThanBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left < right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLessThanMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaLessThanMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `left > right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaGreaterThan<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & {
    readonly __luaGreaterThanBrand: unique symbol;
};

/**
 * Calls to methods with this type are translated to `left > right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaGreaterThanMethod<TRight, TReturn> = ((right: TRight) => TReturn) & {
    readonly __luaGreaterThanMethodBrand: unique symbol;
};

/**
 * Calls to functions with this type are translated to `-operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaNegation<TOperand, TReturn> = ((operand: TOperand) => TReturn) & {
    readonly __luaNegationBrand: unique symbol;
};

/**
 * Calls to method with this type are translated to `-operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaNegationMethod<TReturn> = (() => TReturn) & { readonly __luaNegationMethodBrand: unique symbol };

/**
 * Calls to functions with this type are translated to `~operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseNot<TOperand, TReturn> = ((operand: TOperand) => TReturn) & {
    readonly __luaBitwiseNotBrand: unique symbol;
};

/**
 * Calls to method with this type are translated to `~operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseNotMethod<TReturn> = (() => TReturn) & { readonly __luaBitwiseNotMethodBrand: unique symbol };

/**
 * Calls to functions with this type are translated to `#operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLength<TOperand, TReturn> = ((operand: TOperand) => TReturn) & {
    readonly __luaLengthBrand: unique symbol;
};

/**
 * Calls to method with this type are translated to `#operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLengthMethod<TReturn> = (() => TReturn) & { readonly __luaLengthMethodBrand: unique symbol };
