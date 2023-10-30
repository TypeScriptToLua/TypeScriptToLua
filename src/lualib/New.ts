import { __TS__Boolean } from "./Boolean";
import { __TS__Number } from "./Number";
import { __TS__String } from "./String";

function customNewHandling(name: string, args: any[]): any {
    switch (name) {
        case "String":
            return __TS__String(args[0]);
        case "Boolean":
            return __TS__Boolean(args[0]);
        case "Number":
            return __TS__Number(args[0]);
        default:
            return undefined;
    }
}

export function __TS__New(this: void, target: LuaClass, ...args: any[]): any {
    if ("name" in target && typeof target.name === "string") {
        const customReturn = customNewHandling(target.name, args);

        if (customReturn !== undefined) {
            return customReturn;
        }
    }

    const instance: any = setmetatable({}, target.prototype);
    instance.____constructor(...args);
    return instance;
}
