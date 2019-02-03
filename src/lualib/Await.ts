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





function __TS__Await<T>( value: Promise<T> ) : T {
  if( type(value) === "table" && value.next ) {
    let s   = false;
    let err: string;
    const result = coroutine.yield( value.next( undefined, value => {
      s = true;
      err = value;
    }));
    if( s ) return error(err,0);
    return result;
  } else return value as any;
}

