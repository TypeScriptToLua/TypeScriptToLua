const stringConcat = "a" + ("b" + "c") + "d" + "e";
const numbers = 2 * 2 + 3 + 4 * (5 + 6) !== 7;

function func(this: void, ...args: any) {}

func(() => {
    const b = "A function";
});

func(func());

const array = [func()];
const array2 = [func(), func()];

const object = {
    a: 1,
    b: 2,
    c: 3,
};

const bigObject = {
    a: 1,
    b: 2,
    c: 3,
    d: "value1",
    e: "value2",
};
