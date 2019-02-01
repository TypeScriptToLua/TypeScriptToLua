declare function pcall(func: () => any): any;
declare function type(val: any): string;

function __TS__StringConcat(str1: string, ...args: string[]): string {
  let out = str1;
  for (const arg of args) {
    out = out + arg;
  }
  return out;
}
