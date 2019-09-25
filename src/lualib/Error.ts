type TSTLCapturedErrorStack = Array<{
    namewhat: string;
    name?: string;
    source: string;
    short_src: string;
    currentline: number;
}>;

function __TS__GetErrorStack(constructor: Function): TSTLCapturedErrorStack {
    const functionFrames = [];
    let level = 1;
    while (true) {
        const info = debug.getinfo(level, "f");
        level += 1;
        if (!info) {
            // constructor not in call stack
            level = 1;
            break;
        } else if (info.func === constructor) {
            break;
        }
    }
    while (true) {
        const info = debug.getinfo(level, "Snl");
        if (!info) break;
        if (info.currentline !== -1) {
            functionFrames.push(info);
        }
        level += 1;
    }
    return functionFrames;
}

function __TS__ConvertErrorStack(stack: TSTLCapturedErrorStack): string {
    const info = stack
        .map(v => {
            if (v.namewhat === "") {
                return `${v.short_src}:${v.currentline}`;
            } else {
                return `${v.short_src}:${v.currentline} in ${v.namewhat} ${v.name}`;
            }
        })
        .join("\n");
    const transform = globalThis.__TS__SourceMapTransform;
    return transform ? transform(info) : info;
}

function __TS__GetErrorString(this: void, error: Error): string {
    return error.message !== "" ? `${error.name}: ${error.message}` : error.name;
}

function __TS__InitErrorClass(Type: any): any {
    Type.prototype.__tostring = __TS__GetErrorString;
    return setmetatable(Type, {
        __call: (_self: any, message: string) => new Type(message),
    });
}

Error = __TS__InitErrorClass(
    class {
        public message: string;
        public name = "Error";
        public stack: string;

        constructor(message = "") {
            this.message = message;
            this.stack = __TS__ConvertErrorStack(__TS__GetErrorStack((this.constructor as any).new));
        }
    }
);

for (const errorName of ["RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"]) {
    globalThis[errorName] = __TS__InitErrorClass(
        class extends Error {
            public name = errorName;
        }
    );
}
