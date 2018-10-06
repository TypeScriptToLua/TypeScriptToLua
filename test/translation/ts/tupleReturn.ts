/** !TupleReturn */
declare function tupleReturn(): [number, string];
declare function noTupleReturn(): [number, string];
declare function foo(a: [number, string]): void;
tupleReturn();
noTupleReturn();
let [a, b] = tupleReturn();
let [c, d] = noTupleReturn();
[a, b] = tupleReturn();
[c, d] = noTupleReturn();
let e = tupleReturn();
let f = noTupleReturn();
e = tupleReturn();
f = noTupleReturn();
foo(tupleReturn());
foo(noTupleReturn());
