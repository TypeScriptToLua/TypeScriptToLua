declare enum PromiseState {
  PENDING = 0,
    RESOLVING = 1,
    REJECTING = 2,
    RESOLVED = 3,
    REJECTED = 4,
}

declare interface Promise<T> {

  state: PromiseState;

  next<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T)    => TResult1 | Promise<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;

  catch<TResult = any>(
    onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined | null
  ): Promise<T | TResult>;

  finally<TResult1 = T | any>(
    callback?: (( value: T | any ) => TResult1 | Promise<TResult1> | undefined | null )
  ): Promise<T | TResult1>;

  resolve( value: T ): void;
  reject( reason: any ): void;

}

declare interface PromiseConstructor {
  readonly prototype: Promise<any>;

  new ( f: (
    onfulfilled: ((        )  => void),
    onrejected: ((reason?: any) => void) ) => void ): Promise<never>;
  new <T>( f: (
    onfulfilled: ((value: T)  => void),
    onrejected: ((reason?: any) => void) ) => void ): Promise<T>;

  create<T = undefined>(): Promise<T>;

  reject<T = never>(reason?: any): Promise<T>;

  resolve<T>(value: T | Promise<T>): Promise<T>;
  resolve(): Promise<never>;

  // all constructors
  all<T>(values: Array<(T | Promise<T>)>): Promise<T[]>;
  all<T1, T2>(values: [T1 | Promise<T1>, T2 | Promise<T2>]): Promise<[T1, T2]>;
  all<T1, T2, T3>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>]): Promise<[T1, T2, T3]>;
  // tslint:disable-next-line:max-line-length
  all<T1, T2, T3, T4>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise <T4>]): Promise<[T1, T2, T3, T4]>;
  // tslint:disable-next-line:max-line-length
  all<T1, T2, T3, T4, T5>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise <T4>, T5 | Promise<T5>]): Promise<[T1, T2, T3, T4, T5]>;
  // tslint:disable-next-line:max-line-length
  all<T1, T2, T3, T4, T5, T6>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise <T4>, T5 | Promise<T5>, T6 | Promise<T6>]): Promise<[T1, T2, T3, T4, T5, T6]>;
  // tslint:disable-next-line:max-line-length
  all<T1, T2, T3, T4, T5, T6, T7>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise <T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>]): Promise<[T1, T2, T3, T4, T5, T6, T7]>;
  // tslint:disable-next-line:max-line-length
  all<T1, T2, T3, T4, T5, T6, T7, T8>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise <T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>, T8 | Promise<T8>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
  // tslint:disable-next-line:max-line-length
  all<T1, T2, T3, T4, T5, T6, T7, T8, T9>( values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise <T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>, T8 | Promise<T8>, T9 | Promise<T9>]
  ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
  // tslint:disable-next-line:max-line-length
  all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>( values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise <T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>, T8 | Promise<T8>, T9 | Promise<T9>, T10 | Promise<T10>]
  ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;

  // race constructors
  // tslint:disable-next-line:max-line-length
  race<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>( values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise<T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>, T8 | Promise<T8>, T9 | Promise<T9>, T10 | Promise<T10>] ): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10>;
  // tslint:disable-next-line:max-line-length
  race<T1, T2, T3, T4, T5, T6, T7, T8, T9>( values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise<T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>, T8 | Promise<T8>, T9 | Promise<T9>]
  ): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9>;
  // tslint:disable-next-line:max-line-length
  race<T1, T2, T3, T4, T5, T6, T7, T8>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise<T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>, T8 | Promise<T8>]): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8>;
  // tslint:disable-next-line:max-line-length
  race<T1, T2, T3, T4, T5, T6, T7>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise<T4>, T5 | Promise<T5>, T6 | Promise<T6>, T7 | Promise<T7>]): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7>;
  // tslint:disable-next-line:max-line-length
  race<T1, T2, T3, T4, T5, T6>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise<T4>, T5 | Promise<T5>, T6 | Promise<T6>]): Promise<T1 | T2 | T3 | T4 | T5 | T6>;
  // tslint:disable-next-line:max-line-length
  race<T1, T2, T3, T4, T5>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise<T4>, T5 | Promise<T5>]): Promise<T1 | T2 | T3 | T4 | T5>;
  // tslint:disable-next-line:max-line-length
  race<T1, T2, T3, T4>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>, T4 | Promise<T4>]): Promise<T1 | T2 | T3 | T4>;
  race<T1, T2, T3>(values: [T1 | Promise<T1>, T2 | Promise<T2>, T3 | Promise<T3>]): Promise<T1 | T2 | T3>;
  race<T1, T2>(values: [T1 | Promise<T1>, T2 | Promise<T2>]): Promise<T1 | T2>;
  race<T>(values: Array<(T | Promise<T>)>): Promise<T>;

}

declare var Promise: PromiseConstructor;
