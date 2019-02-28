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

function __TS__Await<T>( value: Promise<T> ) : T {
  if( type(value) === "table" && value.then ) {
    let s   = false;
    let err: string;
    const result = coroutine.yield( value.then( undefined, value => {
      s = true;
      err = value;
    }));
    if( s ) return error(err,0);
    return result;
  } else return value as any;
}
