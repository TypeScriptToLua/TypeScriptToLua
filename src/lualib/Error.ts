interface ErrorType {
    name: string;
    new (...args: any[]): Error;
}

function getErrorStack(constructor: () => any): string | undefined {
    // If debug module is not available in this environment, don't bother trying to get stack trace
    if (debug === undefined) return undefined;

    let level = 1;
    while (true) {
        const info = debug.getinfo(level, "f");
        level += 1;
        if (!info) {
            // constructor is not in call stack
            level = 1;
            break;
        } else if (info.func === constructor) {
            break;
        }
    }

    if (_VERSION.includes("Lua 5.0")) {
        return debug.traceback(`[Level ${level}]`);
    } else {
        // @ts-ignore Fails when compiled with Lua 5.0 types
        return debug.traceback(undefined, level);
    }
}

function wrapErrorToString<T extends Error>(getDescription: (this: T) => string): (this: T) => string {
    return function (this: Error): string {
        const description = getDescription.call(this as T);
        const caller = debug.getinfo(3, "f");
        // @ts-ignore Fails when compiled with Lua 5.0 types
        const isClassicLua = _VERSION.includes("Lua 5.0") || _VERSION === "Lua 5.1";
        if (isClassicLua || (caller && caller.func !== error)) {
            return description;
        } else {
            return `${description}\n${this.stack}`;
        }
    };
}

function initErrorClass(Type: ErrorType, name: string): any {
    Type.name = name;
    return setmetatable(Type, {
        __call: (_self: any, message: string) => new Type(message),
    });
}

export const Error: ErrorConstructor = initErrorClass(
    class implements Error {
        public name = "Error";
        public stack?: string;

        constructor(public message = "") {
            this.stack = getErrorStack((this.constructor as any).new);
            const metatable = getmetatable(this);
            if (metatable && !metatable.__errorToStringPatched) {
                metatable.__errorToStringPatched = true;
                metatable.__tostring = wrapErrorToString(metatable.__tostring);
            }
        }

        public toString(): string {
            return this.message !== "" ? `${this.name}: ${this.message}` : this.name;
        }
    },
    "Error"
);

function createErrorClass(name: string) {
    return initErrorClass(
        class extends Error {
            public name = name;
        },
        name
    );
}

export const RangeError = createErrorClass("RangeError");
export const ReferenceError = createErrorClass("ReferenceError");
export const SyntaxError = createErrorClass("SyntaxError");
export const TypeError = createErrorClass("TypeError");
export const URIError = createErrorClass("URIError");
