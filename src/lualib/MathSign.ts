export function __TS__MathSign(this: void, val: number) {
    if (val > 0) {
        return 1;
    } else if (val < 0) {
        return -1;
    }

    return 0;
}
