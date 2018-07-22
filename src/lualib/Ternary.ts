function __TS__Ternary<T>(condition: boolean, cb1: () => T, cb2: () => T): T {
    if (condition) {
        return cb1();
    } else {
        return cb2();
    }
}
