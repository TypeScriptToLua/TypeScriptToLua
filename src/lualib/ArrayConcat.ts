function __TS__ArrayConcat<T>(arr1: T[], arr2: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr1.length; i++) {
    out[i] = arr1[i];
  }
  for (let i = 0; i < arr2.length; i++) {
    out[i] = arr2[i];
  }
  return out;
}
