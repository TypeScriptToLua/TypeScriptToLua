declare function pcall(func: () => any): any;
declare function type(val: any): string;

function __TS__ArrayConcat(arr1: any[], ...args: any[]): any[] {
  const out: any[] = [];
  for (const val of arr1) {
    out[out.length] = val;
  }
  for (const arg of args) {
    // Hack because we don't have an isArray function
    if (pcall(() => (arg as any[]).length) && type(arg) !== "string") {
        const argAsArray = (arg as any[]);
        for (const val of argAsArray) {
            out[out.length] = val;
        }
    } else {
        out[out.length] = arg;
    }
  }

  return out;
}
