export function __TS__String(this: void, value: unknown): string {
    const valueType = type(value);
    if (valueType === "string") {
        return value as string;
    } else {
        return tostring(value);
    }
}
