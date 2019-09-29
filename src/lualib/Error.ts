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

function __TS__GetErrorString(this: void, error: Error): string {
    return error.message !== "" ? `${error.name}: ${error.message}` : error.name;
}

function __TS__InitErrorClass<T>(Type: ErrorType<T>, name: string): any {
    if (name) {
        Type.name = name;
    }
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
            const mt = getmetatable(this);
            mt.__tostring = mt.__tostring || __TS__GetErrorString;
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
