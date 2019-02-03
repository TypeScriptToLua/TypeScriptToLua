declare function type( value:any ): string;
declare function error( value:string, level?:number ): never;

declare interface Coroutine { }

declare namespace coroutine {
  function yield( value:any ): any;
  function create( arg:any, ...args:any[] ): Coroutine;
  /** @tuplereturn */
  function resume( co:Coroutine, ...args: any[] ): [ boolean,any ];
  function status(co:Coroutine): 'running' | 'suspended' | 'normal' | 'dead';
}

declare interface Promise<T = undefined> {
  next<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T)    => TResult1 | Promise<TResult1>) | undefined | null,
    onrejected?: ((reason: string ) => TResult2 | Promise<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
}

declare interface PromiseConstructor {
  resolve<T>( this:void ): Promise<T>;
}

declare const Promise: PromiseConstructor;






function __TS__Async<TResult>(    f: ( ...args:any[] ) => TResult  ): ( ...args: any[] ) => Promise<TResult>
{
  return ( ...args:any[] ): Promise<TResult> => {
    const co = coroutine.create( f );

    function handleError( reason: string ): never {
      return error(reason, 0 );
    }

    function handleNext<T>( ...args ): any {
      const [state, value] = coroutine.resume( co, ...args );
      if( state ) {
        if( coroutine.status(co) === "dead" ) return value;
        if( value && value.next ) return value.next( handleNext, handleError );
        else return value;
      } else {
        return handleError(value);
      }
    }

    return Promise.resolve<undefined>().next( () => {
      return handleNext( ...args );
    });
  };
}

