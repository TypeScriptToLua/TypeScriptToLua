/* tslint:disable */
declare function pcall(func: Function): any;
declare function type(val: any): string;

function __TS__ArrayConcat(arr1: any[], ...args: any[]): any[] {
  const out: any[] = [];
  for (let i = 0; i < arr1.length; i++) {
    out[out.length] = arr1[i];
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // Hack because we don't have an isArray function
    if (pcall(() => (arg as any[]).length) && type(arg) !== "string") {
        const argAsArray = (arg as any[]);
        for (let j = 0; j < argAsArray.length; j++) {
            out[out.length] = argAsArray[j];
        }
    } else {
        out[out.length] = arg;
    }
  }

  return out;
}
