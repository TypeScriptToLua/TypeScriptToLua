import { __TS__Match } from "./Match";

export function __TS__Number(this: void, value: unknown): number {
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

        // Handle 0b/0B (binary) and 0o/0O (octal) literal prefixes
        const [sign, prefix, digits] = __TS__Match(stringWithoutSpaces, "^(-?)0([bBoO])(.+)");
        if (prefix !== undefined) {
            const base = prefix === "b" || prefix === "B" ? 2 : 8;
            const result = tonumber(digits, base);
            if (result !== undefined) {
                return sign === "-" ? -result : result;
            }
        }

        return NaN;
    } else if (valueType === "boolean") {
        return value ? 1 : 0;
    } else {
        return NaN;
    }
}
