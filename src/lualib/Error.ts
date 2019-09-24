Error = class {
    public static captureStackTrace(targetObject: {}, depth: number): void {
        targetObject["stack"] = debug.traceback(undefined, depth);
    }

    public message: string;
    public name: string;
    public stack?: string;

    constructor(message?: string, name?: string) {
        this.message = message || "";
        this.name = name || "Error";
        Error["captureStackTrace"](this, name ? 5 : 4);
    }

    public __tostring(): string {
        return `${this.name}: ${this.message}`;
    }
} as any;

setmetatable(Error, { __call: (_self: any, message: string) => new Error(message) });

/** Standard error types */

RangeError = class extends Error {
    constructor(message?: string) {
        // @ts-ignore
        super(message, "RangeError");
    }
    public __tostring(): string {
        return `${this.name}: ${this.message}`;
    }
} as any;
setmetatable(RangeError, {
    __call: (_self: any, message: string) => new RangeError(message),
    __index: getmetatable(RangeError),
});

ReferenceError = class extends Error {
    constructor(message?: string) {
        // @ts-ignore
        super(message, "ReferenceError");
    }
    public __tostring(): string {
        return `${this.name}: ${this.message}`;
    }
} as any;
setmetatable(ReferenceError, {
    __call: (_self: any, message: string) => new ReferenceError(message),
    __index: getmetatable(ReferenceError),
});

SyntaxError = class extends Error {
    constructor(message?: string) {
        // @ts-ignore
        super(message, "SyntaxError");
    }
    public __tostring(): string {
        return `${this.name}: ${this.message}`;
    }
} as any;
setmetatable(SyntaxError, {
    __call: (_self: any, message: string) => new SyntaxError(message),
    __index: getmetatable(SyntaxError),
});

TypeError = class extends Error {
    constructor(message?: string) {
        // @ts-ignore
        super(message, "TypeError");
    }
    public __tostring(): string {
        return `${this.name}: ${this.message}`;
    }
} as any;
setmetatable(TypeError, {
    __call: (_self: any, message: string) => new TypeError(message),
    __index: getmetatable(TypeError),
});

URIError = class extends Error {
    constructor(message?: string) {
        // @ts-ignore
        super(message, "URIError");
    }
    public __tostring(): string {
        return `${this.name}: ${this.message}`;
    }
} as any;
setmetatable(URIError, {
    __call: (_self: any, message: string) => new URIError(message),
    __index: getmetatable(URIError),
});
