import { __TS__Number } from "./Number";
import { Number } from "./NumberClass";

export function __TS__NumberValueOf(this: unknown): undefined | number {
    switch (typeof this) {
        case "object":
            if (this instanceof Number) {
                return this.get();
            }
            break;
        case "number":
            return this;
        default:
            return __TS__Number(this);
    }
}
