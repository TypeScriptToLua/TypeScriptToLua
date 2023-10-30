import { __TS__Number } from "../lualib/Number";

export class Number {
    private value;

    constructor(value: unknown) {
        this.value = __TS__Number(value);
    }

    public toString() {
        return this.value;
    }
}
