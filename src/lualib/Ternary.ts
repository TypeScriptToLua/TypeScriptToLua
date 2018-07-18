function __TS__Ternary(condition: any, cb1: () => void, cb2: () => void) {
    if (condition) {
        cb1();
    } else {
        cb2();
    }
}
