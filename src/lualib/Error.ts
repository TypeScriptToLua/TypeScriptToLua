interface ErrorType<T> extends Function {
    name: string;
    new (...args: any[]): T;
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

function __TS__GetErrorString(this: void, errorObj: Error): string {
    const description = errorObj.message !== "" ? `${errorObj.name}: ${errorObj.message}` : errorObj.name;
    const caller = debug.getinfo(3, "f");
    if (_VERSION === "Lua 5.1" || (caller && caller.func !== error)) {
        return description;
    } else {
        return `${description}\n${errorObj.stack}`;
    }
}

function __TS__InitErrorClass<T>(Type: ErrorType<T>, name: string): any {
    Type.name = name;
    return setmetatable(Type, {
        __call: (_self: any, message: string) => new Type(message),
    });
}

Error = __TS__InitErrorClass(
    class {
        public name = "Error";
        public stack: string;

        constructor(public message = "") {
            this.stack = __TS__GetErrorStack((this.constructor as any).new);
        }

        public toString(): string {
            return __TS__GetErrorString(this);
        }
    },
    "Error"
);

for (const errorName of ["RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"]) {
    globalThis[errorName] = __TS__InitErrorClass(
        class extends Error {
            public name = errorName;

            public toString(): string {
                return __TS__GetErrorString(this);
            }
        },
        errorName
    );
}
