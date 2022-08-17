type AnyTable = Record<any, any>;
// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/consistent-type-definitions
type AnyNotNil = {};

/**
 * Indicates a type is a language extension provided by TypescriptToLua when used as a value or function call.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TBrand A string used to uniquely identify the language extension type
 */
declare interface LuaExtension<TBrand extends string> {
    readonly __tstlExtension: TBrand;
}

/**
 * Indicates a type is a language extension provided by TypescriptToLua when used in a for-of loop.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TBrand A string used to uniquely identify the language extension type
 */
declare interface LuaIterationExtension<TBrand extends string> {
    readonly __tstlIterable: TBrand;
}

/**
 * Returns multiple values from a function, by wrapping them in a LuaMultiReturn tuple.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param T A tuple type with each element type representing a return value's type.
 * @param values Return values.
 */
declare const $multi: (<T extends any[]>(...values: T) => LuaMultiReturn<T>) & LuaExtension<"MultiFunction">;

/**
 * Represents multiple return values as a tuple.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param T A tuple type with each element type representing a return value's type.
 */
declare type LuaMultiReturn<T extends any[]> = T & {
    readonly __tstlMultiReturn: any;
};

/**
 * Creates a Lua-style numeric for loop (for i=start,limit,step) when used in for...of. Not valid in any other context.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param start The first number in the sequence to iterate over.
 * @param limit The last number in the sequence to iterate over.
 * @param step The amount to increment each iteration.
 */
declare const $range: ((start: number, limit: number, step?: number) => Iterable<number>) &
    LuaExtension<"RangeFunction">;

/**
 * Transpiles to the global vararg (`...`)
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 */
declare const $vararg: string[] & LuaExtension<"VarargConstant">;

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
    LuaIterationExtension<"Iterable">;

/**
 * Represents an object that can be iterated with pairs()
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key returned each iteration.
 * @param TValue The type of the value returned each iteration.
 */
declare type LuaPairsIterable<TKey extends AnyNotNil, TValue> = Iterable<[TKey, TValue]> &
    LuaIterationExtension<"Pairs">;

/**
 * Represents an object that can be iterated with pairs(), where only the key value is used.
 *
 * @param TKey The type of the key returned each iteration.
 */
declare type LuaPairsKeyIterable<TKey extends AnyNotNil> = Iterable<TKey> & LuaIterationExtension<"PairsKey">;

/**
 * Calls to functions with this type are translated to `left + right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaAddition<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & LuaExtension<"Addition">;

/**
 * Calls to methods with this type are translated to `left + right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaAdditionMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"AdditionMethod">;

/**
 * Calls to functions with this type are translated to `left - right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaSubtraction<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"Subtraction">;

/**
 * Calls to methods with this type are translated to `left - right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaSubtractionMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"SubtractionMethod">;

/**
 * Calls to functions with this type are translated to `left * right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaMultiplication<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"Multiplication">;

/**
 * Calls to methods with this type are translated to `left * right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaMultiplicationMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"MultiplicationMethod">;

/**
 * Calls to functions with this type are translated to `left / right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaDivision<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & LuaExtension<"Division">;

/**
 * Calls to methods with this type are translated to `left / right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaDivisionMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"DivisionMethod">;

/**
 * Calls to functions with this type are translated to `left % right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaModulo<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & LuaExtension<"Modulo">;

/**
 * Calls to methods with this type are translated to `left % right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaModuloMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"ModuloMethod">;

/**
 * Calls to functions with this type are translated to `left ^ right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaPower<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & LuaExtension<"Power">;

/**
 * Calls to methods with this type are translated to `left ^ right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaPowerMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"PowerMethod">;

/**
 * Calls to functions with this type are translated to `left // right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaFloorDivision<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"FloorDivision">;

/**
 * Calls to methods with this type are translated to `left // right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaFloorDivisionMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"FloorDivisionMethod">;

/**
 * Calls to functions with this type are translated to `left & right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseAnd<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"BitwiseAnd">;

/**
 * Calls to methods with this type are translated to `left & right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseAndMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"BitwiseAndMethod">;

/**
 * Calls to functions with this type are translated to `left | right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseOr<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"BitwiseOr">;

/**
 * Calls to methods with this type are translated to `left | right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseOrMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"BitwiseOrMethod">;

/**
 * Calls to functions with this type are translated to `left ~ right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseExclusiveOr<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"BitwiseExclusiveOr">;

/**
 * Calls to methods with this type are translated to `left ~ right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseExclusiveOrMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"BitwiseExclusiveOrMethod">;

/**
 * Calls to functions with this type are translated to `left << right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseLeftShift<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"BitwiseLeftShift">;

/**
 * Calls to methods with this type are translated to `left << right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseLeftShiftMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"BitwiseLeftShiftMethod">;

/**
 * Calls to functions with this type are translated to `left >> right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseRightShift<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"BitwiseRightShift">;

/**
 * Calls to methods with this type are translated to `left >> right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseRightShiftMethod<TRight, TReturn> = ((right: TRight) => TReturn) &
    LuaExtension<"BitwiseRightShiftMethod">;

/**
 * Calls to functions with this type are translated to `left .. right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaConcat<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & LuaExtension<"Concat">;

/**
 * Calls to methods with this type are translated to `left .. right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaConcatMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"ConcatMethod">;

/**
 * Calls to functions with this type are translated to `left < right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLessThan<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) & LuaExtension<"LessThan">;

/**
 * Calls to methods with this type are translated to `left < right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLessThanMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"LessThanMethod">;

/**
 * Calls to functions with this type are translated to `left > right`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TLeft The type of the left-hand-side of the operation.
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaGreaterThan<TLeft, TRight, TReturn> = ((left: TLeft, right: TRight) => TReturn) &
    LuaExtension<"GreaterThan">;

/**
 * Calls to methods with this type are translated to `left > right`, where `left` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TRight The type of the right-hand-side of the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaGreaterThanMethod<TRight, TReturn> = ((right: TRight) => TReturn) & LuaExtension<"GreaterThanMethod">;

/**
 * Calls to functions with this type are translated to `-operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaNegation<TOperand, TReturn> = ((operand: TOperand) => TReturn) & LuaExtension<"Negation">;

/**
 * Calls to method with this type are translated to `-operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaNegationMethod<TReturn> = (() => TReturn) & LuaExtension<"NegationMethod">;

/**
 * Calls to functions with this type are translated to `~operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseNot<TOperand, TReturn> = ((operand: TOperand) => TReturn) & LuaExtension<"BitwiseNot">;

/**
 * Calls to method with this type are translated to `~operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaBitwiseNotMethod<TReturn> = (() => TReturn) & LuaExtension<"BitwiseNotMethod">;

/**
 * Calls to functions with this type are translated to `#operand`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TOperand The type of the value in the operation.
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLength<TOperand, TReturn> = ((operand: TOperand) => TReturn) & LuaExtension<"Length">;

/**
 * Calls to method with this type are translated to `#operand`, where `operand` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TReturn The resulting (return) type of the operation.
 */
declare type LuaLengthMethod<TReturn> = (() => TReturn) & LuaExtension<"LengthMethod">;

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
    LuaExtension<"TableGet">;

/**
 * Calls to methods with this type are translated to `table[key]`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 * @param TValue The type of the value stored in the table.
 */
declare type LuaTableGetMethod<TKey extends AnyNotNil, TValue> = ((key: TKey) => TValue) &
    LuaExtension<"TableGetMethod">;

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
    LuaExtension<"TableSet">;

/**
 * Calls to methods with this type are translated to `table[key] = value`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 * @param TValue The type of the value to assign to the table.
 */
declare type LuaTableSetMethod<TKey extends AnyNotNil, TValue> = ((key: TKey, value: TValue) => void) &
    LuaExtension<"TableSetMethod">;

/**
 * Calls to functions with this type are translated to `table[key] = true`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TTable The type to access as a Lua table.
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableAddKey<TTable extends AnyTable, TKey extends AnyNotNil> = ((table: TTable, key: TKey) => void) &
    LuaExtension<"TableAddKey">;

/**
 * Calls to methods with this type are translated to `table[key] = true`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableAddKeyMethod<TKey extends AnyNotNil> = ((key: TKey) => void) & LuaExtension<"TableAddKeyMethod">;

/**
 * Calls to functions with this type are translated to `table[key] ~= nil`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TTable The type to access as a Lua table.
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableHas<TTable extends AnyTable, TKey extends AnyNotNil> = ((table: TTable, key: TKey) => boolean) &
    LuaExtension<"TableHas">;

/**
 * Calls to methods with this type are translated to `table[key] ~= nil`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableHasMethod<TKey extends AnyNotNil> = ((key: TKey) => boolean) & LuaExtension<"TableHasMethod">;

/**
 * Calls to functions with this type are translated to `table[key] = nil`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TTable The type to access as a Lua table.
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableDelete<TTable extends AnyTable, TKey extends AnyNotNil> = ((table: TTable, key: TKey) => boolean) &
    LuaExtension<"TableDelete">;

/**
 * Calls to methods with this type are translated to `table[key] = nil`, where `table` is the object with the method.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the key to use to access the table.
 */
declare type LuaTableDeleteMethod<TKey extends AnyNotNil> = ((key: TKey) => boolean) &
    LuaExtension<"TableDeleteMethod">;

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
    LuaExtension<"TableNew">;

/**
 * A convenience type for working directly with a Lua table.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 *
 * @param TKey The type of the keys used to access the table.
 * @param TValue The type of the values stored in the table.
 */
declare const LuaTable: LuaTableConstructor;

/**
 * A convenience type for working directly with a Lua table, used as a map.
 *
 * This differs from LuaTable in that the `get` method may return `nil`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 * @param K The type of the keys used to access the table.
 * @param V The type of the values stored in the table.
 */
declare interface LuaMap<K extends AnyNotNil = AnyNotNil, V = any> extends LuaPairsIterable<K, V> {
    get: LuaTableGetMethod<K, V | undefined>;
    set: LuaTableSetMethod<K, V>;
    has: LuaTableHasMethod<K>;
    delete: LuaTableDeleteMethod<K>;
}

/**
 * A convenience type for working directly with a Lua table, used as a map.
 *
 * This differs from LuaTable in that the `get` method may return `nil`.
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 * @param K The type of the keys used to access the table.
 * @param V The type of the values stored in the table.
 */
declare const LuaMap: (new <K extends AnyNotNil = AnyNotNil, V = any>() => LuaMap<K, V>) & LuaExtension<"TableNew">;

/**
 * Readonly version of {@link LuaMap}.
 *
 * @param K The type of the keys used to access the table.
 * @param V The type of the values stored in the table.
 */
declare interface ReadonlyLuaMap<K extends AnyNotNil = AnyNotNil, V = any> extends LuaPairsIterable<K, V> {
    get: LuaTableGetMethod<K, V | undefined>;
    has: LuaTableHasMethod<K>;
}

/**
 * A convenience type for working directly with a Lua table, used as a set.
 *
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 * @param T The type of the keys used to access the table.
 */
declare interface LuaSet<T extends AnyNotNil = AnyNotNil> extends LuaPairsKeyIterable<T> {
    add: LuaTableAddKeyMethod<T>;
    has: LuaTableHasMethod<T>;
    delete: LuaTableDeleteMethod<T>;
}

/**
 * A convenience type for working directly with a Lua table, used as a set.
 *
 * For more information see: https://typescripttolua.github.io/docs/advanced/language-extensions
 * @param T The type of the keys used to access the table.
 */
declare const LuaSet: (new <T extends AnyNotNil = AnyNotNil>() => LuaSet<T>) & LuaExtension<"TableNew">;

/**
 * Readonly version of {@link LuaSet}.
 *
 * @param T The type of the keys used to access the table.
 */
declare interface ReadonlyLuaSet<T extends AnyNotNil = AnyNotNil> extends LuaPairsKeyIterable<T> {
    has: LuaTableHasMethod<T>;
}

interface ObjectConstructor {
    /** Returns an array of keys of an object, when iterated with `pairs`. */
    keys<K>(o: LuaPairsIterable<K, any> | LuaPairsKeyIterable<K>): K[];

    /** Returns an array of values of an object, when iterated with `pairs`. */
    values<V>(o: LuaPairsIterable<any, V>): V[];

    /** Returns an array of key/values of an object, when iterated with `pairs`. */
    entries<K, V>(o: LuaPairsIterable<K, V>): Array<[K, V]>;
}
