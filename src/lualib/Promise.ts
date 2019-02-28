declare function error( value:string, level?:number ): never;
const logError: any = print;

let runAtNextTick: ( func: () => void ) => void = func => func();
function setRunAtNextTickFunction(  func: (f: () => void ) => void ): void {
  runAtNextTick = func;
}

enum PromiseState {
  PENDING = 0,
  FULFILLED = 1,
  REJECTED = 2,
}

interface Deferred< T, TResult > {
  promise: PromiseImpl<TResult>;
  onFulfilled?: (( this: void, value: T) => TResult) | undefined;
  onRejected?: (( this: void, reason: any) => TResult) | undefined;
}

class PromiseImpl<T = never> {

  public static resolve<T = never>(): PromiseImpl<T>;
  public static resolve<T = never>( value: T | PromiseImpl<T> ): PromiseImpl<T>;
  public static resolve<T = never>( value?: T | PromiseImpl<T> ): PromiseImpl<T> {
    const p = new PromiseImpl<T>();
    PromiseImpl.PromiseResolutionProcedure( p, value as T );
    return p;
  }

  public static reject( reason: any ): PromiseImpl<never> {
    const p = new PromiseImpl();
    p.reject( reason );
    return p;
  }

  protected static create<T = undefined>(): PromiseImpl<T> {
    return new PromiseImpl<T>();
  }

  public static all( promises: Array<PromiseImpl<any>> ): PromiseImpl<any[]> {
    const p = new PromiseImpl<any[]>();
    if ( promises.length === 0 ) {
      p.resolve([]);
    } else {
      let pending = promises.length;
      const result: { [id: number]: any } = {};
      let rejected = false;

      const synchronizer = ( idx: number, success: boolean ) => {
        return (value: any) => {
          pending--;
          result[idx] = value;
          if ( !success ) {
            rejected = true;
          }
          if ( pending === 0 ) {
            const res: any[] = [];
            for ( let i = 0; i < promises.length; ++i ) {
              res.push( result[i] );
            }
            if ( rejected ) {
              p.reject( res );
            } else {
              p.resolve( res );
            }
          }
        };
      };

      promises.forEach( ( promise, i ) => {
        promise.then( synchronizer( i, true ), synchronizer( i, false ) );
      });
    }
    return p;
  }

  public static race( promises: Array<PromiseImpl<any>> ): PromiseImpl<any> {
    const p = new PromiseImpl<any>();
    if ( promises.length === 0 ) {
      p.reject("no promises passed");
    } else {
      for ( const promise of promises ) {
        promise.then(
          value => p.resolve(value),
          reason => p.reject(reason)
        );
      }
    }
    return p;
  }

  protected static PromiseResolutionProcedure<T>( promise: PromiseImpl<T>, x: T | PromiseImpl<T> ): PromiseImpl<T> {

    // If promise and x refer to the same object, reject promise with a TypeError as the reason.
    if ( promise as any === x ) {
      PromiseImpl.reject("TypeError: resolving promise with itself");
      return promise;
    }

    // If x is not an object or function, fulfill promise with x.
    if ( typeof x !== "object" ) {
      return promise.fulfill(x);
    }

    //// If x is a promise, adopt its state [3.4]:
    //// * If x is pending, promise must remain pending until x is fulfilled or rejected.
    //// * If/when x is fulfilled, fulfill promise with the same value.
    //// * If/when x is rejected, reject promise with the same reason.

    // Otherwise, if x is an object or function,
    // * Let then be x.then. [3.5]
    // * If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
    let xthen: any;
    try {
      xthen = (x as PromiseImpl<T> ).then;
    } catch ( err ) {
      PromiseImpl.reject( err );
      return promise;
    }
    // * If then is a function, call it with x as this, first argument resolvePromise,
    // and second argument rejectPromise, where:
    // * * If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
    // * * If/when rejectPromise is called with a reason r, reject promise with r.
    // * * If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made,
    // the first call takes precedence, and any further calls are ignored.
    let called = false;
    const resolvePromise = (y: any) => {
      if ( called ) {
        return;
      }
      called = true;
      PromiseImpl.PromiseResolutionProcedure( promise, y );
    };

    const rejectPromise = (err: any) => {
      if ( called ) {
        return;
      }
      called = true;
      PromiseImpl.reject(err);
    };

    if ( typeof xthen === "function" ) {
      try {
        xthen( x, resolvePromise, rejectPromise );
      } catch ( err ) {
        // * * If calling then throws an exception e,
        // * * * If resolvePromise or rejectPromise have been called, ignore it.
        // * * * Otherwise, reject promise with e as the reason.
        rejectPromise( err );
      }
    } else { // * If then is not a function, fulfill promise with x.
      promise.fulfill( x as T );
    }
    return promise;
  }

  protected state: PromiseState = PromiseState.PENDING;
  protected value!: T;
  protected reason!: any;
  protected handledError?: boolean;
  protected queue: Array< Deferred< T, any > > = [];

  public constructor();
  public constructor( executor: (
    onfulfilled: ( () => void),
    onrejected: ((reason?: any) => void) ) => void );
  public constructor( executor: (
    onfulfilled: ((value: T) => void),
    onrejected: ((reason?: any) => void) ) => void );
  public constructor( executor?: (
    onfulfilled: ((value?: T) => void),
    onrejected: ((reason?: any) => void) ) => void ) {
    if ( executor ) {
      try {
        executor(
          value => {
            this.fulfill( value as T);
          },
          reason => {
            this.reject( reason );
          });
      } catch ( err ) {
        this.reject( err );
      }
    }
  }

  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseImpl<TResult1>) | undefined,
    onRejected?: ((reason: any) => TResult2 | PromiseImpl<TResult2>) | undefined
  ): PromiseImpl<TResult1 | TResult2> {
    const promise = new PromiseImpl<TResult1 | TResult2>();

    if ( this.state === PromiseState.PENDING ) {
        this.queue.push( {
          promise,
          onFulfilled,
          onRejected,
        } as Deferred< T, TResult1 | TResult2 > );
    } else if ( this.state === PromiseState.FULFILLED ) {
        if ( onFulfilled ) {
          runAtNextTick( () => {
            try {
              PromiseImpl.PromiseResolutionProcedure( promise, onFulfilled(this.value) as TResult1 );
            } catch ( err ) {
              PromiseImpl.reject( err );
            }
          });
        } else {
          return this as any;
        }
    }  else if ( this.state === PromiseState.REJECTED ) {
        this.handledError = true;
        if ( onRejected ) {
          runAtNextTick( () => {
            try {
              PromiseImpl.PromiseResolutionProcedure( promise, onRejected(this.reason) as TResult2);
            } catch ( err ) {
              PromiseImpl.reject( err );
            }
          });
        } else {
          return this as any;
        }
    }

    return promise;
  }

  public catch<TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseImpl<TResult>) | undefined
  ): PromiseImpl<T | TResult> {
    return this.then( undefined, onRejected );
  }

  public finally(onFinally?: (() => void) | undefined | null): PromiseImpl<T> {
    return this.then(
       v => {
        onFinally();
        return v;
      },
      err => {
        onFinally();
        return error(err);
      }
    );
  }

  protected resolve( value: T ): void {
    PromiseImpl.PromiseResolutionProcedure<T>( this, value );
  }

  protected reject( reason: any ): void {
    if ( this.state !== PromiseState.PENDING ) {
      return;
    }
    this.state = PromiseState.REJECTED;
    this.reason = reason;
    this.queue.forEach( d => {
      if ( typeof d.onRejected !== "function" ) { // if reject isnt a function -> ignore it
        d.promise.reject(this.reason);
      } else {
        runAtNextTick( () => {
          try {
            const val = (d.onRejected as any)( reason );
            PromiseImpl.PromiseResolutionProcedure( d.promise, val );
          } catch ( err ) {
            d.promise.reject( err );
          }
        });
      }
    });
  }

  protected __gc(): void {
    if ( this.state === PromiseState.REJECTED && !this.handledError ) {
      for ( const d of this.queue ) {
        if ( d.onRejected ) {
          return;
        }
      }
      logError("Unhandled rejected promise ", this.reason );
    }
  }

  protected fulfill( value: T ): PromiseImpl<T> {
    if ( this.state !== PromiseState.PENDING ) {
      return this;
    }
    this.state = PromiseState.FULFILLED;
    this.value = value as T;
    this.queue.forEach( d => {
      if ( typeof d.onFulfilled !== "function" ) { // if fulfill isnt a function -> ignore it
        d.promise.fulfill(this.value);
      } else {
        runAtNextTick( () => {
          try {
            const val = (d.onFulfilled as any)( value );
            PromiseImpl.PromiseResolutionProcedure( d.promise, val );
          } catch ( err ) {
            d.promise.reject( err );
          }
        });
      }
    });
    return this;
  }

} // PromiseImpl<T>




interface PromiseConstructor {
    readonly prototype: Promise<any>;
    new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;

    all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike <T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>, T8 | PromiseLike<T8>, T9 | PromiseLike<T9>, T10 | PromiseLike<T10>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8, T9>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike <T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>, T8 | PromiseLike<T8>, T9 | PromiseLike<T9>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike <T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>, T8 | PromiseLike<T8>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
    all<T1, T2, T3, T4, T5, T6, T7>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike <T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>]): Promise<[T1, T2, T3, T4, T5, T6, T7]>;
    all<T1, T2, T3, T4, T5, T6>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike <T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>]): Promise<[T1, T2, T3, T4, T5, T6]>;
    all<T1, T2, T3, T4, T5>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike <T4>, T5 | PromiseLike<T5>]): Promise<[T1, T2, T3, T4, T5]>;
    all<T1, T2, T3, T4>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike <T4>]): Promise<[T1, T2, T3, T4]>;
    all<T1, T2, T3>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>]): Promise<[T1, T2, T3]>;
    all<T1, T2>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>]): Promise<[T1, T2]>;
    all<T>(values: (T | PromiseLike<T>)[]): Promise<T[]>;
    race<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike<T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>, T8 | PromiseLike<T8>, T9 | PromiseLike<T9>, T10 | PromiseLike<T10>]): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10>;
    race<T1, T2, T3, T4, T5, T6, T7, T8, T9>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike<T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>, T8 | PromiseLike<T8>, T9 | PromiseLike<T9>]): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9>;
    race<T1, T2, T3, T4, T5, T6, T7, T8>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike<T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>, T8 | PromiseLike<T8>]): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8>;
    race<T1, T2, T3, T4, T5, T6, T7>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike<T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>, T7 | PromiseLike<T7>]): Promise<T1 | T2 | T3 | T4 | T5 | T6 | T7>;
    race<T1, T2, T3, T4, T5, T6>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike<T4>, T5 | PromiseLike<T5>, T6 | PromiseLike<T6>]): Promise<T1 | T2 | T3 | T4 | T5 | T6>;
    race<T1, T2, T3, T4, T5>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike<T4>, T5 | PromiseLike<T5>]): Promise<T1 | T2 | T3 | T4 | T5>;
    race<T1, T2, T3, T4>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>, T4 | PromiseLike<T4>]): Promise<T1 | T2 | T3 | T4>;
    race<T1, T2, T3>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>, T3 | PromiseLike<T3>]): Promise<T1 | T2 | T3>;
    race<T1, T2>(values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>]): Promise<T1 | T2>;
    race<T>(values: (T | PromiseLike<T>)[]): Promise<T>;
    reject<T = never>(reason?: any): Promise<T>;
    resolve<T>(value: T | PromiseLike<T>): Promise<T>;
    resolve(): Promise<void>;
}



declare var Promise: PromiseConstructor;
Promise = PromiseImpl as any;
