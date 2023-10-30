export function __TS__Boolean(this: void, value: unknown): boolean {
    const valueType = type(value);
    if (valueType === "boolean") {
        return value as boolean;
    } else if (valueType === "number") {
        return value !== 0;
    } else if (valueType === "string") {
        return (value as string).length !== 0;
    } else {
        return false;
    }
}
