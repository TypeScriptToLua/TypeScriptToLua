let count01 = 0;

// Pure unary
count01++;

// Assignment
let count02 = count01++;

// Self-assignment
count01 = count01++;

// Self-referencing assignment
count01 += count01++;


let count03 = 0;

// Pure unary
--count03;

// Assignment
let count04 = --count03;

// Self-assignment
count03 = --count03;

// Self-referencing assignment
count03 += --count03;