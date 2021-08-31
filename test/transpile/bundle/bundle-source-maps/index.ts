import { getNumber, Operation } from "./largeFile";

// Local variables
const left = getNumber(3, 4, Operation.MUL);
const right = getNumber(5, 6, Operation.SUM);

export const myNumber = getNumber(left, right, Operation.MUL);
export const sourceMap = (globalThis as any).__TS__sourcemap;
