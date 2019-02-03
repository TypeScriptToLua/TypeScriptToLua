/// <reference path="./promise.d.ts" />

/*
 * just a minimal demonstration of using async function with typescript
 *
 * compile this demonstration with   "./dist/index.js test_async_await/test.ts"
 * after that join run it            "lua test_async_await/test.lua"
 *
 */



require("./test_async_await/promise");

declare function print( ...args: any[] ):void;
declare function assert( test:boolean ): void;


// some asynchroneous function
const longLastingOperation = async () => {
  return "did it finally :-)";
};


// the main function is also asynchroneous
const run = async () => {

  // other async functions can be awaited
  const result = await longLastingOperation();
  assert( result === "did it finally :-)");

  // its also possible to await promises
  const num = await new Promise<number>( (res, rej) => {
    res(10);
  });
  assert( num===10);

  // if a promise fails, the await throws and can be handled
  try {
    await( Promise.reject("that went wrong") );
  } catch ( err ) {
    print("saved it '", err, "'" );
    assert( err==="that went wrong");
  }

  // an async function has a return
  return num;
};


const p = run().next(
  value => {
    assert( value===10 );
    print("finished successfull", value );
  },
  err => {
    print("Caught error:", err );
  });
