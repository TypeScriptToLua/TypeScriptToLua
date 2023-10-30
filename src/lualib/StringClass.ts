import { __TS__String } from "../lualib/String";

export class String {
    private value;

    constructor(value: unknown) {
        this.value = __TS__String(value);
    }

    public get() {
        return this.value;
    }

    public toString() {
        return this.value;
    }
}
