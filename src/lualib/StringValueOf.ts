import { __TS__String } from "./String";
import { String } from "./StringClass";

export function __TS__StringValueOf(this: unknown): string | undefined {
    switch (typeof this) {
        case "object":
            if (this instanceof String) {
                return this.get();
            }
            break;
        case "string":
            return this;
        default:
            return __TS__String(this);
    }
}
