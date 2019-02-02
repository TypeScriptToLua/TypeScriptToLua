function __TS__StringConcat(str1: string, ...args: string[]): string {
  let out = str1;
  for (const arg of args) {
    out = out + arg;
  }
  return out;
}
