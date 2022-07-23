import { ModuleKind, ScriptTarget } from "typescript";
import { LuaTarget } from "../../../src";
import { unsupportedForTargetButOverrideAvailable } from "../../../src/transformation/utils/diagnostics";
import { awaitMustBeInAsyncFunction } from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

const promiseTestLib = `
// Some logging utility, useful for asserting orders of operations

const allLogs: any[] = [];
function log(...values: any[]) {
    allLogs.push(...values);
}

// Create a promise and store its resolve and reject functions, useful for creating pending promises

function defer<T>() {
    let resolve: (data: any) => void = () => {};
    let reject: (reason: string) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}`;

test("can await already resolved promise", () => {
    util.testFunction`
        const result = [];
        async function abc() {
            return await Promise.resolve(30);
        }
        abc().then(value => result.push(value));

        return result;
    `.expectToEqual([30]);
});

test("can await already rejected promise", () => {
    util.testFunction`
        const result = [];
        async function abc() {
            return await Promise.reject("test rejection");
        }
        abc().catch(reason => result.push(reason));

        return result;
    `.expectToEqual(["test rejection"]);
});

test("can await pending promise", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(data => log("resolving original promise", data));

        async function abc() {
            return await promise;
        }

        const awaitingPromise = abc();
        awaitingPromise.then(data => log("resolving awaiting promise", data));

        resolve("resolved data");

        return allLogs;

    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["resolving original promise", "resolved data", "resolving awaiting promise", "resolved data"]);
});

test("can await non-promise values", () => {
    util.testFunction`
        async function foo() {
            return await "foo";
        }

        async function bar() {
            return await { foo: await foo(), bar: "bar" };
        }

        async function baz() {
            return (await bar()).foo + (await bar()).bar;
        }

        const { state, value } = baz() as any;
        return { state, value };
    `.expectToEqual({
        state: 1, // __TS__PromiseState.Fulfilled
        value: "foobar",
    });
});

test.each(["async function abc() {", "const abc = async () => {"])(
    "can return non-promise from async function (%p)",
    functionHeader => {
        util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(data => log("resolving original promise", data));

        ${functionHeader}
            await promise;
            return "abc return data"
        }

        const awaitingPromise = abc();
        awaitingPromise.then(data => log("resolving awaiting promise", data));

        resolve("resolved data");

        return allLogs;

    `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                "resolving original promise",
                "resolved data",
                "resolving awaiting promise",
                "abc return data",
            ]);
    }
);

test.each(["async function abc() {", "const abc = async () => {"])(
    "can have multiple awaits in async function (%p)",
    functionHeader => {
        util.testFunction`
        const { promise: promise1, resolve: resolve1 } = defer<string>();
        const { promise: promise2, resolve: resolve2 } = defer<string>();
        const { promise: promise3, resolve: resolve3 } = defer<string>();
        promise1.then(data => log("resolving promise1", data));
        promise2.then(data => log("resolving promise2", data));
        promise3.then(data => log("resolving promise3", data));

        ${functionHeader}
            const result1 = await promise1;
            const result2 = await promise2;
            const result3 = await promise3;
            return [result1, result2, result3];
        }

        const awaitingPromise = abc();
        awaitingPromise.then(data => log("resolving awaiting promise", data));

        resolve1("data1");
        resolve2("data2");
        resolve3("data3");

        return allLogs;

    `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                "resolving promise1",
                "data1",
                "resolving promise2",
                "data2",
                "resolving promise3",
                "data3",
                "resolving awaiting promise",
                ["data1", "data2", "data3"],
            ]);
    }
);

test("can make inline async functions", () => {
    util.testFunction`
        const foo = async function() { return "foo"; };
        const bar = async function() { return await foo(); };

        const { state, value } = bar() as any;
        return { state, value };
    `.expectToEqual({
        state: 1, // __TS__PromiseState.Fulfilled
        value: "foo",
    });
});

test("can make async lambdas with expression body", () => {
    util.testFunction`
        const foo = async () => "foo";
        const bar = async () => await foo();

        const { state, value } = bar() as any;
        return { state, value };
    `.expectToEqual({
        state: 1, // __TS__PromiseState.Fulfilled
        value: "foo",
    });
});

test("can await async function from async function", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(data => log("resolving original promise", data));

        async function abc() {
            return await promise;
        }

        async function def() {
            return await abc();
        }

        const awaitingPromise = def();
        awaitingPromise.then(data => log("resolving awaiting promise", data));

        resolve("resolved data");

        return allLogs;

    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["resolving original promise", "resolved data", "resolving awaiting promise", "resolved data"]);
});

test("async function returning value is same as non-async function returning promise", () => {
    util.testFunction`
        function f(): Promise<number> {
            return Promise.resolve(42);
        }

        async function fAsync(): Promise<number> {
            return 42;
        }

        const { state: state1, value: value1 } = f() as any;
        const { state: state2, value: value2 } = fAsync() as any;

        return {
            state1, value1,
            state2, value2
        };
    `.expectToEqual({
        state1: 1, // __TS__PromiseState.Fulfilled
        value1: 42,
        state2: 1, // __TS__PromiseState.Fulfilled
        value2: 42,
    });
});

test("correctly handles awaited functions rejecting", () => {
    util.testFunction`
        const { promise: promise1, reject } = defer<string>();
        const { promise: promise2 } = defer<string>();

        promise1.then(data => log("resolving promise1", data), reason => log("rejecting promise1", reason));
        promise2.then(data => log("resolving promise2", data));

        async function abc() {
            const result1 = await promise1;
            const result2 = await promise2;
            return [result1, result2];
        }

        const awaitingPromise = abc();
        awaitingPromise.catch(reason => log("awaiting promise was rejected because:", reason));

        reject("test reject");

        return allLogs;

    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["rejecting promise1", "test reject", "awaiting promise was rejected because:", "test reject"]);
});

test("can call async function at top-level", () => {
    util.testModule`
        export let aStarted = false;
        async function a() {
            aStarted = true;
            return 42;
        }

        a(); // Call async function (but cannot await)
    `
        .setOptions({ module: ModuleKind.ESNext, target: ScriptTarget.ES2017 })
        .expectToEqual({
            aStarted: true,
        });
});

test("async function throws error", () => {
    util.testFunction`
        async function a() {
            throw "test throw";
        }

        const { state, rejectionReason } = a() as any;
        return { state, rejectionReason };
    `.expectToEqual({
        state: 2, // __TS__PromiseState.Rejected
        rejectionReason: "test throw",
    });
});

test("async lambda throws error", () => {
    util.testFunction`
        const a = async () => {
            throw "test throw";
        }

        const { state, rejectionReason } = a() as any;
        return { state, rejectionReason };
    `.expectToEqual({
        state: 2, // __TS__PromiseState.Rejected
        rejectionReason: "test throw",
    });
});

test("async function throws object", () => {
    util.testFunction`
        async function a() {
            throw new Error("test throw");
        }

        const { state, rejectionReason } = a() as any;
        return { state, rejectionReason };
    `.expectToEqual({
        state: 2, // __TS__PromiseState.Rejected
        rejectionReason: {
            message: "test throw",
            name: "Error",
            stack: expect.stringContaining("stack traceback"),
        },
    });
});

test.each([
    "await a();",
    "const b = await a();",
    "export const b = await a();",
    "declare function foo(n: number): number; foo(await a());",
    "declare function foo(n: number): number; const b = foo(await a());",
    "const b = [await a()];",
    "const b = [4, await a()];",
    "const b = true ? 4 : await a();",
])("cannot await at top-level (%p)", awaitUsage => {
    util.testModule`
        async function a() {
            return 42;
        }

        ${awaitUsage}
        export {} // Required to make TS happy, cannot await without import/exports
    `
        .setOptions({ module: ModuleKind.ESNext, target: ScriptTarget.ES2017 })
        .expectToHaveDiagnostics([awaitMustBeInAsyncFunction.code]);
});

test("async function can access varargs", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        async function a(...args: string[]) {
            log(await promise);
            log(args[1]);
        }

        const awaitingPromise = a("A", "B", "C");
        resolve("resolved");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["resolved", "B"]);
});

test("async function can forward varargs", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        async function a(...args: string[]) {
            log(await promise);
            log(...args);
        }

        const awaitingPromise = a("A", "B", "C");
        resolve("resolved");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["resolved", "A", "B", "C"]);
});

test("async function adopts pending promise", () => {
    util.testFunction`
        let resolve: (v: string) => void = () => {};
        async function receive(): Promise<string> {
            return new Promise(res => {
                resolve = res;
            });
        }

        receive().then(v => {
            log(v);
        });

        resolve("delayed resolve");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["delayed resolve"]);
});

test("async function adopts resolved promise", () => {
    util.testFunction`
        async function receive(): Promise<string> {
            return new Promise(resolve => {
                resolve("resolved!");
            });
        }

        receive().then(v => {
            log(v);
        });

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["resolved!"]);
});

test("async function adopts rejected promise", () => {
    util.testFunction`
        async function receive(): Promise<string> {
            return new Promise((_, reject) => {
                reject("rejected");
            });
        }

        receive().catch(err => {
            log(err);
        });

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["rejected"]);
});

test("return in catch aborts async method", () => {
    util.testFunction`
        async function asyncFunc() {
            try {
                await Promise.reject("rejection");
                log("Should not be seen");
            } catch {
                log("C");
                return "result";
            }
            log("Should also not be seen");
        }

        asyncFunc().then(v => log("resolved", v));

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["C", "resolved", "result"]);
});

test.each(["async function abc() {", "const abc = async () => {"])(
    "can throw error after await in async function (%p)",
    functionHeader => {
        util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(data => log("resolving first promise", data));

        ${functionHeader}
            await promise;
            log("run abc");
            throw "test throw";
        }

        const awaitingPromise = abc();
        awaitingPromise.catch(error => log("caught error", error));

        resolve("resolved data");
        return allLogs;
    `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["resolving first promise", "resolved data", "run abc", "caught error", "test throw"]);
    }
);

test.each(["async function abc() {", "const abc = async () => {"])(
    "can throw object after await in async function (%p)",
    functionHeader => {
        util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(data => log("resolving first promise", data));

        ${functionHeader}
            await promise;
            log("run abc");
            throw new Error("test throw");
        }

        const awaitingPromise = abc();
        awaitingPromise.catch(error => log("caught error", error));

        resolve("resolved data");
        return allLogs;
    `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                "resolving first promise",
                "resolved data",
                "run abc",
                "caught error",
                {
                    message: "test throw",
                    name: "Error",
                    stack: expect.stringContaining("stack traceback"),
                },
            ]);
    }
);

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1105
describe("try/catch in async function", () => {
    util.testEachVersion(
        "await inside try/catch returns inside async function",
        () => util.testModule`
            export let result = 0;
            async function foo(): Promise<number> {
                try {
                    return await new Promise(resolve => resolve(4));
                } catch {
                    throw "an error occurred in the async function"
                }
            }
            foo().then(value => {
                result = value;
            });
        `,
        // Cannot execute LuaJIT with test runner
        {
            ...util.expectEachVersionExceptJit(builder => builder.expectToEqual({ result: 4 })),
            [LuaTarget.Lua50]: builder =>
                builder.expectToHaveDiagnostics([unsupportedForTargetButOverrideAvailable.code]),
            [LuaTarget.Lua51]: builder =>
                builder.expectToHaveDiagnostics([unsupportedForTargetButOverrideAvailable.code]),
        }
    );

    util.testEachVersion(
        "await inside try/catch throws inside async function",
        () => util.testModule`
            export let reason = "";
            async function foo(): Promise<number> {
                try {
                    return await new Promise((resolve, reject) => reject("test error"));
                } catch (e) {
                    throw "an error occurred in the async function: " + e;
                }
            }
            foo().catch(e => {
                reason = e;
            });
        `,
        {
            ...util.expectEachVersionExceptJit(builder =>
                builder.expectToEqual({ reason: "an error occurred in the async function: test error" })
            ),
            [LuaTarget.Lua50]: builder =>
                builder.expectToHaveDiagnostics([unsupportedForTargetButOverrideAvailable.code]),
            [LuaTarget.Lua51]: builder =>
                builder.expectToHaveDiagnostics([unsupportedForTargetButOverrideAvailable.code]),
        }
    );

    util.testEachVersion(
        "await inside try/catch deferred rejection uses catch clause",
        () =>
            util.testModule`
            export let reason = "";
            let reject: (reason: string) => void;

            async function foo(): Promise<number> {
                try {
                    return await new Promise((res, rej) => { reject = rej; });
                } catch (e) {
                    throw "an error occurred in the async function: " + e;
                }
            }
            foo().catch(e => {
                reason = e;
            });
            reject("test error");
        `,
        {
            ...util.expectEachVersionExceptJit(builder =>
                builder.expectToEqual({ reason: "an error occurred in the async function: test error" })
            ),
            [LuaTarget.Lua50]: builder =>
                builder.expectToHaveDiagnostics([unsupportedForTargetButOverrideAvailable.code]),
            [LuaTarget.Lua51]: builder =>
                builder.expectToHaveDiagnostics([unsupportedForTargetButOverrideAvailable.code]),
        }
    );

    test("try/finally in async function", () => {
        util.testModule`
            const foo = async () => {
                throw "foo error";
            };

            let finallyCalled = false;

            const run = async () => {
                try {
                    await foo();
                } finally {
                    finallyCalled = true;
                }
                return 10;
            };

            let succeeded: any = false;
            let rejected: any = false;

            run()
                .then(_ => { succeeded = true })
                .catch(e => { rejected = e });

            export const result = { finallyCalled, succeeded, rejected };
        `.expectToEqual({
            result: {
                finallyCalled: true,
                succeeded: false,
                rejected: "foo error",
            },
        });
    });

    test("async function adopts pending promise in try", () => {
        util.testFunction`
            let resolve: (v: string) => void = () => {};
            async function receive(): Promise<string> {
                try
                {
                    return new Promise(res => {
                        resolve = res;
                    });
                }
                catch
                {
                }
            }

            receive().then(v => {
                log(v);
            });

            resolve("delayed resolve");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["delayed resolve"]);
    });

    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1272
    test("Awaiting a rejected promise should halt function execution (#1272)", () => {
        util.testModule`
            const foo = async () => {
                throw new Error('foo error');
            };

            let halted = true;
            let caught = "";

            const run = async () => {
                try {
                    await foo();
                    halted = false;
                } catch (err) {
                    caught = 'catch err: ' + err;
                }
            };

            let succeeded: any = false;
            let rejected: any = false;

            run()
                .then(_ => { succeeded = true },
                      e => { rejected = e });

            export const result = { halted, caught, succeeded, rejected };
        `.expectToEqual({
            result: {
                halted: true,
                caught: "catch err: Error: foo error",
                succeeded: true,
                rejected: false,
            },
        });
    });

    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1272
    test("Awaiting a rejecting promise should halt function execution (#1272)", () => {
        util.testModule`
            let rej: (error: any) => void = () => {};
            const foo = () => new Promise((_, reject) => {
                rej = reject;
            });

            let halted = true;
            let caught = "";

            const run = async () => {
                try {
                    await foo();
                    halted = false;
                } catch (err) {
                    caught = 'catch err: ' + err;
                }
            };

            let succeeded: any = false;
            let rejected: any = false;

            run()
                .then(_ => { succeeded = true },
                      e => { rejected = e });

            rej("rejection message");

            export const result = { halted, caught, succeeded, rejected };
        `.expectToEqual({
            result: {
                halted: true,
                caught: "catch err: rejection message",
                succeeded: true,
                rejected: false,
            },
        });
    });

    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1272
    test("Async try/catch complicated case (#1272)", () => {
        util.testModule`
            const foo = async () => {
                throw new Error('foo error');
            };

            let halted = true;
            let caught = "";

            const run = async () => {
                try {
                    await foo(); // This throws
                } catch (err) {
                    caught = 'catch err: ' + err; // This catches the async thrown error, function continues
                }
                try {
                    throw "throw 2"; // Another throw
                } catch (err) {
                    try {
                        await foo();
                    } catch (err2) {
                        return \`caught: \${err}, then: \${err2}\`; // Async function should exit here
                    }
                }
                halted = false; // This code should not be called
                return 10;
            };

            let succeeded: any = false;
            let rejected: any = false;
            let value: any = undefined;

            run()
                .then(v => { succeeded = true; value = v },
                      e => { rejected = e });

            export const result = { halted, caught, succeeded, rejected, value };
        `.expectToEqual({
            result: {
                halted: true,
                caught: "catch err: Error: foo error",
                succeeded: true,
                rejected: false,
                value: "caught: throw 2, then: Error: foo error",
            },
        });
    });
});
