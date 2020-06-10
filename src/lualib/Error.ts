interface ErrorType {
    name: string;
    new (...args: any[]): Error;
}

function __TS__GetErrorStack(constructor: Function): string {
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

    return debug.traceback(undefined, level);
}

function __TS__WrapErrorToString<T extends Error>(getDescription: (this: T) => string): (this: T) => string {
    return function (this: Error): string {
        const description = getDescription.call(this);
        const caller = debug.getinfo(3, "f");
        if (_VERSION === "Lua 5.1" || (caller && caller.func !== error)) {
            return description;
        } else {
            return `${description}\n${this.stack}`;
        }
    };
}

function __TS__InitErrorClass(Type: ErrorType, name: string): any {
    Type.name = name;
    return setmetatable(Type, {
        __call: (_self: any, message: string) => new Type(message),
    });
}

Error = __TS__InitErrorClass(
    class implements Error {
        public name = "Error";
        public stack: string;

        constructor(public message = "") {
            this.stack = __TS__GetErrorStack((this.constructor as any).new);
            const metatable = getmetatable(this);
            if (!metatable.__errorToStringPatched) {
                metatable.__errorToStringPatched = true;
                metatable.__tostring = __TS__WrapErrorToString(metatable.__tostring);
            }
        }

        public toString(): string {
            return this.message !== "" ? `${this.name}: ${this.message}` : this.name;
        }
    },
    "Error"
);

for (const errorName of ["RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"]) {
    globalThis[errorName] = __TS__InitErrorClass(
        class extends Error {
            public name = errorName;
        },
        errorName
    );
}
