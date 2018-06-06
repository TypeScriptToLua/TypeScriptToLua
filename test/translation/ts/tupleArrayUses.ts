// test cases where tuples are used as arrays
declare const tuple: [string, number, boolean];

// tslint:disable:no-empty no-unused-expression
for (const value of tuple) {} // for-of loop
tuple.forEach(v => {}); // Array.prototype.forEach
const num = tuple[1]; // array access
const len = tuple.length; // array length
