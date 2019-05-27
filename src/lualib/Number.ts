function __TS__Number(this: void, value: unknown): number {
    const valueType = type(value);
    if (valueType === "number") {
        return value as number;
    } else if (valueType === "string") {
        const numberValue = tonumber(value);
        if (numberValue) return numberValue;

        if (value === "Infinity") return Infinity;
        if (value === "-Infinity") return -Infinity;
        const [stringWithoutSpaces] = string.gsub(value as string, "%s", "");
        if (stringWithoutSpaces === "") return 0;

        return NaN;
    } else if (valueType === "boolean") {
        return value ? 1 : 0;
    } else {
        return NaN;
    }
}
