import { __TS__Boolean } from "./Boolean";
import { Boolean } from "./BooleanClass";

export function __TS__BooleanValueOf(this: unknown): boolean | undefined {
    switch (typeof this) {
        case "object":
            if (this instanceof Boolean) {
                return this.get();
            }
            break;
        case "boolean":
            return this;
        default:
            return __TS__Boolean(this);
    }
}
