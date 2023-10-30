import { __TS__Boolean } from "../lualib/Boolean";

export class Boolean {
    private value;

    constructor(value: unknown) {
        this.value = __TS__Boolean(value);
    }

    public toString() {
        return this.value;
    }
}
