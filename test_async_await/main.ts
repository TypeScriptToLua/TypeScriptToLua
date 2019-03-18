declare var print: any;

try {
  async function async_func( i:number ) {
    return i;
  }

  const test = async () => {
    print( await 1 );
    print( await 2 );
    // print( await Promise.resolve(3) );
    print( await async_func(4) );
    return 5
  }

  test().then( print, print );

} catch (err ) {
  print( err );
}
