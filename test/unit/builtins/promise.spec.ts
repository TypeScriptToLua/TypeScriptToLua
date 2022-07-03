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

test("can create resolved promise", () => {
    util.testFunction`
        const { state, value } = Promise.resolve(42) as any;
        return { state, value };
    `.expectToEqual({
        state: 1, // __TS__PromiseState.Fulfilled
        value: 42,
    });
});

test("can create rejected promise", () => {
    util.testFunction`
        const { state, rejectionReason } = Promise.reject("test rejection") as any;
        return { state, rejectionReason };
    `.expectToEqual({
        state: 2, // __TS__PromiseState.Rejected
        rejectionReason: "test rejection",
    });
});

test("promise constructor executor throwing rejects promise", () => {
    util.testFunction`
        const { state, rejectionReason } = new Promise(() => { throw "executor exception"; }) as any;
        return { state, rejectionReason };
    `.expectToEqual({
        state: 2, // __TS__PromiseState.Rejected
        rejectionReason: "executor exception",
    });
});

test("promise can be resolved", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        let result: string | undefined;
        let rejectResult: string | undefined;

        promise.then(
            data => { result = data; },
            reason => { rejectResult = reason; }
        );

        const beforeResolve = result;

        resolve("Hello!");

        const afterResolve = result;

        return { beforeResolve, afterResolve, rejectResult };
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual({
            beforeResolve: undefined,
            afterResolve: "Hello!",
            rejectResult: undefined,
        });
});

test("promise can be rejected", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        let resolveResult: string | undefined;
        let rejectResult: string | undefined;

        promise.then(
            data => { resolveResult = data; },
            reason => { rejectResult = reason; }
        );

        const beforeReject = rejectResult;

        reject("Hello!");

        const afterReject = rejectResult;

        return { beforeReject, afterReject, resolveResult };
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual({
            beforeReject: undefined,
            afterReject: "Hello!",
            resolveResult: undefined,
        });
});

test("promise cannot be resolved more than once", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        promise.then(
            data => { log(data); }
        );

        resolve("Hello!");
        resolve("World!"); // Second resolve should be ignored

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["Hello!"]);
});

test("promise cannot be rejected more than once", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        promise.then(
            _ => {},
            reason => { log(reason); }
        );

        reject("Hello!");
        reject("World!"); // Second reject should be ignored

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["Hello!"]);
});

test("promise cannot be rejected after resolving", () => {
    util.testFunction`
        const { promise, resolve, reject } = defer<string>();

        promise.then(
            data => { log(data); },
            reason => { log(reason); }
        );

        resolve("Hello!");
        reject("World!"); // should be ignored because already resolved

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["Hello!"]);
});

test("promise cannot be resolved after rejecting", () => {
    util.testFunction`
        const { promise, resolve, reject } = defer<string>();

        promise.then(
            data => { log(data); },
            reason => { log(reason); }
        );

        reject("Hello!");
        resolve("World!"); // should be ignored because already rejected

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["Hello!"]);
});

test("promise can be (then-resolve) observed more than once", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        promise.then(
            data => { log("then 1: " + data); }
        );

        promise.then(
            data => { log("then 2: " + data); }
        );

        resolve("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["then 1: Hello!", "then 2: Hello!"]);
});

test("promise can be (then-reject) observed more than once", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        promise.then(
            undefined,
            reason => { log("then 1: " + reason); }
        );

        promise.then(
            undefined,
            reason => { log("then 2: " + reason); },
        );

        reject("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["then 1: Hello!", "then 2: Hello!"]);
});

test("promise can be (catch) observed more than once", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        promise.catch(
            reason => { log("catch 1: " + reason); }
        );

        promise.catch(
            reason => { log("catch 2: " + reason); },
        );

        reject("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["catch 1: Hello!", "catch 2: Hello!"]);
});

test("promise chained resolve resolves all", () => {
    util.testFunction`
        const { promise: promise1, resolve: resolve1 } = defer<string>();
        const { promise: promise2, resolve: resolve2 } = defer<string>();
        const { promise: promise3, resolve: resolve3 } = defer<string>();

        promise3.then(data => {
            log("promise3: " + data);
            resolve2(data);
        });
        promise2.then(data => {
            log("promise2: " + data);
            resolve1(data);
        });
        promise1.then(data => {
            log("promise1: " + data);
        });

        resolve3("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise3: Hello!", "promise2: Hello!", "promise1: Hello!"]);
});

test("promise then returns a literal", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const promise2 = promise.then(data => {
            log("promise resolved with: " + data);
            return "promise 1 resolved: " + data;
        });

        promise2.then(data => {
            log("promise2 resolved with: " + data);
        });

        resolve("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise resolved with: Hello!", "promise2 resolved with: promise 1 resolved: Hello!"]);
});

test("promise then returns a resolved promise", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const promise2 = promise.then(data => {
            log("promise resolved with: " + data);
            return Promise.resolve("promise 1 resolved: " + data);
        });

        promise2.then(data => {
            log("promise2 resolved with: " + data);
        });

        resolve("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise resolved with: Hello!", "promise2 resolved with: promise 1 resolved: Hello!"]);
});

test("promise then returns a rejected promise", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const promise2 = promise.then(data => {
            log("promise resolved with: " + data);
            return Promise.reject("promise 1: reject!");
        });

        promise2.catch(reason => {
            log("promise2 rejected with: " + reason);
        });

        resolve("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise resolved with: Hello!", "promise2 rejected with: promise 1: reject!"]);
});

test("promise then returns a pending promise (resolves)", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        let resolve2: any;

        const promise2 = promise.then(data => {
            log("promise resolved with: " + data);

            const promise3 = new Promise((res) => {
                resolve2 = res;
            });

            promise3.then(data2 => {
                log("promise3 resolved with: " + data2);
            });

            return promise3;
        });

        promise2.then(data => {
            log("promise2 resolved with: " + data);
        });

        // Resolve promise 1
        resolve("Hello!");

        // Resolve promise 2 and 3
        resolve2("World!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual([
            "promise resolved with: Hello!",
            "promise3 resolved with: World!",
            "promise2 resolved with: World!",
        ]);
});

test("promise then returns a pending promise (rejects)", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        let reject: any;

        const promise2 = promise.then(data => {
            log("promise resolved with: " + data);

            const promise3 = new Promise((_, rej) => {
                reject = rej;
            });

            promise3.catch(reason => {
                log("promise3 rejected with: " + reason);
            });

            return promise3;
        });

        promise2.catch(reason => {
            log("promise2 rejected with: " + reason);
        });

        // Resolve promise 1
        resolve("Hello!");

        // Reject promise 2 and 3
        reject("World!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual([
            "promise resolved with: Hello!",
            "promise3 rejected with: World!",
            "promise2 rejected with: World!",
        ]);
});

test("promise then onFulfilled throws", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const promise2 = promise.then(data => {
            throw "fulfill exception!"
        });

        promise2.catch(reason => {
            log("promise2 rejected with: " + reason);
        });

        resolve("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise2 rejected with: fulfill exception!"]);
});

test("promise then onRejected throws", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        const promise2 = promise.then(
            _ => {},
            reason => { throw "fulfill exception from onReject!" }
        );

        promise2.catch(reason => {
            log("promise2 rejected with: " + reason);
        });

        reject("Hello!");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise2 rejected with: fulfill exception from onReject!"]);
});

test("then on resolved promise immediately calls callback", () => {
    util.testFunction`
        Promise.resolve(42).then(data => { log(data); });

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual([42]);
});

test("then on rejected promise immediately calls callback", () => {
    util.testFunction`
        Promise.reject("already rejected").then(data => { log("resolved", data); }, reason => { log("rejected", reason); });

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["rejected", "already rejected"]);
});

test("second then throws", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        promise.then(data => {
            // nothing
            log("then1", data)
        });

        promise.then(data => {
            log("then2", data)
            throw "test throw";
        }).catch(err => {
            // caught
            log("rejected: ", err)
        });

        resolve("mydata");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["then1", "mydata", "then2", "mydata", "rejected: ", "test throw"]);
});

test("chained then throws", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        promise.then(data => {
            // nothing
            log("then1", data)
        }).then(data => {
            log("then2", data)
            throw "test throw";
        }).catch(err => {
            // caught
            log("rejected: ", err)
        });

        resolve("mydata");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual([
            "then1",
            "mydata",
            "then2", // Does not have data because first then returned undefined
            "rejected: ",
            "test throw",
        ]);
});

test("empty then resolves", () => {
    util.testFunction`
    const { promise, resolve } = defer<string>();

    promise.then().then(v => { log("then2", v) });

    resolve("mydata");

    return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["then2", "mydata"]);
});

test("empty then rejects", () => {
    util.testFunction`
    const { promise, reject } = defer<string>();

    promise.then().catch(err => { log("catch", err) });

    reject("my error");

    return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["catch", "my error"]);
});

test("catch on rejected promise immediately calls callback", () => {
    util.testFunction`
        Promise.reject("already rejected").catch(reason => { log(reason); });

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["already rejected"]);
});

test("finally on resolved promise immediately calls callback", () => {
    util.testFunction`
        Promise.resolve(42).finally(() => { log("finally"); });

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["finally"]);
});

test("finally on rejected promise immediately calls callback", () => {
    util.testFunction`
        Promise.reject("already rejected").finally(() => { log("finally"); });

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["finally"]);
});

test("direct chaining", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        promise
            .then(data => {
                log("resolving then1", data);
                return "then 1 data";
            }).then(data => {
                log("resolving then2", data);
                throw "test throw";
            }).catch(reason => {
                log("handling catch", reason);
            });

        resolve("test data");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual([
            "resolving then1",
            "test data",
            "resolving then2",
            "then 1 data",
            "handling catch",
            "test throw",
        ]);
});

describe("finally behaves same as then/catch", () => {
    const thenCatchPromise = `
        const { promise, resolve, reject } = defer<string>();
        promise
            .then(data => {
                log("do something", data);
                log("final code");
            })
            .catch(reason => {
                log("handling error", reason);
                log("final code");
            });
    `;

    const finallyPromise = `
        const { promise, resolve, reject } = defer<string>();
        promise
            .then(data => {
                log("do something", data);
            })
            .catch(reason => {
                log("handling error", reason);
            })
            .finally(() => {
                log("final code");
            });
    `;

    test("when resolving", () => {
        const thenResult = util.testFunction`
            ${thenCatchPromise}
            resolve("test data");
            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .getLuaExecutionResult();

        const finallyResult = util.testFunction`
            ${finallyPromise}
            resolve("test data");
            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .getLuaExecutionResult();

        expect(finallyResult).toEqual(thenResult);
    });

    test("when rejecting", () => {
        const thenResult = util.testFunction`
            ${thenCatchPromise}
            reject("test rejection reason");
            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .getLuaExecutionResult();

        const finallyResult = util.testFunction`
            ${finallyPromise}
            reject("test rejection reason");
            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .getLuaExecutionResult();

        expect(finallyResult).toEqual(thenResult);
    });
});

test("example: asynchronous web request", () => {
    const testHarness = `
        interface UserData { name: string, age: number}
        const requests = new Map<number, (userData: UserData) => void>();
        function getUserData(id: number, callback: (userData: UserData) => void) {
            requests.set(id, callback);
        }
        function emulateRequestReturn(id: number, data: UserData) {
            requests.get(id)!(data);
        }
    `;

    util.testFunction`
        // Wrap function getUserData(id: number, callback: (userData: UserData) => void) into a Promise
        function getUserDataAsync(id: number): Promise<UserData> {
            return new Promise(resolve => {
                getUserData(id, resolve);
            });
        }

        const user1DataPromise = getUserDataAsync(1);
        const user2DataPromise = getUserDataAsync(2);

        user1DataPromise.then(() => log("received data for user 1"));
        user2DataPromise.then(() => log("received data for user 2"));

        const allDataPromise = Promise.all([user1DataPromise, user2DataPromise]);

        allDataPromise.then(([user1data, user2data]) => {
            log("all requests completed", user1data, user2data);
        });

        emulateRequestReturn(2, { name: "bar", age: 42 });
        emulateRequestReturn(1, { name: "foo", age: 35 });

        return allLogs;
    `
        .setTsHeader(testHarness + promiseTestLib)
        .expectToEqual([
            "received data for user 2",
            "received data for user 1",
            "all requests completed",
            {
                name: "foo",
                age: 35,
            },
            {
                name: "bar",
                age: 42,
            },
        ]);
});

test("promise is instanceof promise", () => {
    util.testExpression`Promise.resolve(4) instanceof Promise`.expectToMatchJsResult();
});

test("chained then on resolved promise", () => {
    util.testFunction`
        Promise.resolve("result1").then(undefined, () => {}).then(value => log(value));
        Promise.resolve("result2").then(value => "then1", () => {}).then(value => log(value));
        Promise.resolve("result3").then(value => undefined, () => {}).then(value => log(value ?? "undefined"));
        Promise.resolve("result4").then(value => "then2").then(value => [value, "then3"]).then(([v1, v2]) => log(v1, v2));

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["result1", "then1", "undefined", "then2", "then3"]);
});

test("chained catch on rejected promise", () => {
    util.testFunction`
        Promise.reject("reason1").then(() => {}).then(v => log("resolved", v), reason => log("rejected", reason));
        Promise.reject("reason2").then(() => {}, () => "reason3").then(v => log("resolved", v));
        Promise.reject("reason4").then(() => {}, () => undefined).then(v => log("resolved", v ?? "undefined"));

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["rejected", "reason1", "resolved", "reason3", "resolved", "undefined"]);
});

// Issue 2 from https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1105
test("catch after then catches rejected promise", () => {
    util.testFunction`
        Promise.reject('test error')
            .then(result => {
                log("then", result);
            })
            .catch(e => {
                log("catch", e);
            })

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["catch", "test error"]);
});

test("promise unwraps resolved promise result", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(v => log(v));

        resolve(Promise.resolve("result"));

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["result"]);
});

test("resolving promise with rejected promise rejects the promise", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.catch(err => log(err));

        resolve(Promise.reject("reject"));

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["reject"]);
});

test("resolving promise with pending promise will keep pending until promise2 resolved", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(v => log("promise 1", v));

        const { promise: promise2, resolve: resolve2 } = defer<string>();
        promise2.then(v => log("promise 2", v));

        resolve(promise2);
        resolve2("result");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise 2", "result", "promise 1", "result"]);
});

test("resolving promise with pending promise will keep pending until promise2 rejects", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.catch(v => log("promise 1", v));

        const { promise: promise2, reject: reject2 } = defer<string>();
        promise2.catch(v => log("promise 2", v));

        resolve(promise2);
        reject2("rejection");

        return allLogs;
    `
        .setTsHeader(promiseTestLib)
        .expectToEqual(["promise 2", "rejection", "promise 1", "rejection"]);
});

describe("Promise.all", () => {
    test("resolves once all arguments are resolved", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();
            const { promise: promise3, resolve: resolve3 } = defer<string>();

            const promise = Promise.all([promise1, promise2, promise3]);
            promise.then(([result1, result2, result3]) => {
                log(result1, result2, result3);
            });

            resolve1("promise 1 result!");
            resolve2("promise 2 result!");
            resolve3("promise 3 result!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["promise 1 result!", "promise 2 result!", "promise 3 result!"]);
    });

    test("rejects on first rejection", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, reject: reject2 } = defer<string>();
            const { promise: promise3, resolve: resolve3 } = defer<string>();

            const promise = Promise.all([promise1, promise2, promise3]);
            promise.then(
                ([result1, result2, result3]) => {
                    log(result1, result2, result3);
                },
                reason => {
                    log(reason);
                }
            );

            resolve1("promise 1 result!");
            reject2("promise 2 rejects!");
            resolve3("promise 3 result!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["promise 2 rejects!"]);
    });

    test("handles already-resolved promises", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();

            const promise = Promise.all([promise1, Promise.resolve("already resolved!")]);
            promise.then(([result1, result2]) => {
                log(result1, result2);
            });

            resolve1("promise 1 result!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["promise 1 result!", "already resolved!"]);
    });

    test("handles non-promise data", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();

            const promise = Promise.all([42, promise1, "foo"]);
            promise.then(([result1, result2, result3]) => {
                log(result1, result2, result3);
            });

            resolve1("promise 1 result!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([42, "promise 1 result!", "foo"]);
    });

    test("returns already-resolved promise if no pending promises in arguments", () => {
        util.testFunction`
            const { state, value } = Promise.all([42, Promise.resolve("already resolved!"), "foo"]) as any;
            return { state, value };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 1, // __TS__PromiseState.Fulfilled
                value: [42, "already resolved!", "foo"],
            });
    });

    test("returns already-rejected promise if already rejected promise in arguments", () => {
        util.testFunction`
            const { state, rejectionReason } = Promise.all([42, Promise.reject("already rejected!")]) as any;
            return { state, rejectionReason };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 2, // __TS__PromiseState.Rejected
                rejectionReason: "already rejected!",
            });
    });
});

describe("Promise.allSettled", () => {
    test("resolves once all arguments are resolved", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();
            const { promise: promise3, resolve: resolve3 } = defer<string>();

            const promise = Promise.allSettled([promise1, promise2, promise3]);
            promise.then(([result1, result2, result3]) => {
                log(result1, result2, result3);
            });

            resolve3("promise 3 result!");
            resolve1("promise 1 result!");
            resolve2("promise 2 result!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                { status: "fulfilled", value: "promise 1 result!" },
                { status: "fulfilled", value: "promise 2 result!" },
                { status: "fulfilled", value: "promise 3 result!" },
            ]);
    });

    test("resolves once all arguments are rejected", () => {
        util.testFunction`
            const { promise: promise1, reject: reject1 } = defer<string>();
            const { promise: promise2, reject: reject2 } = defer<string>();
            const { promise: promise3, reject: reject3 } = defer<string>();

            const promise = Promise.allSettled([promise1, promise2, promise3]);
            promise.then(([result1, result2, result3]) => {
                log(result1, result2, result3);
            });

            reject2("promise 2 rejected!");
            reject1("promise 1 rejected!");
            reject3("promise 3 rejected!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                { status: "rejected", reason: "promise 1 rejected!" },
                { status: "rejected", reason: "promise 2 rejected!" },
                { status: "rejected", reason: "promise 3 rejected!" },
            ]);
    });

    test("resolves once all arguments are rejected or resolved", () => {
        util.testFunction`
            const { promise: promise1, reject: reject1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();
            const { promise: promise3, reject: reject3 } = defer<string>();

            const promise = Promise.allSettled([promise1, promise2, promise3]);
            promise.then(([result1, result2, result3]) => {
                log(result1, result2, result3);
            });

            resolve2("promise 2 resolved!");
            reject1("promise 1 rejected!");
            reject3("promise 3 rejected!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                { status: "rejected", reason: "promise 1 rejected!" },
                { status: "fulfilled", value: "promise 2 resolved!" },
                { status: "rejected", reason: "promise 3 rejected!" },
            ]);
    });

    test("handles already resolved promises", () => {
        util.testFunction`
            const { promise, resolve } = defer<string>();

            const returnedPromise = Promise.allSettled([Promise.resolve("already resolved"), promise]);
            returnedPromise.then(([result1, result2]) => {
                log(result1, result2);
            });

            resolve("promise resolved!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                { status: "fulfilled", value: "already resolved" },
                { status: "fulfilled", value: "promise resolved!" },
            ]);
    });

    test("handles already rejected promises", () => {
        util.testFunction`
            const { promise, resolve } = defer<string>();

            const returnedPromise = Promise.allSettled([Promise.reject("already rejected"), promise]);
            returnedPromise.then(([result1, result2]) => {
                log(result1, result2);
            });

            resolve("promise resolved!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                { status: "rejected", reason: "already rejected" },
                { status: "fulfilled", value: "promise resolved!" },
            ]);
    });

    test("handles literal arguments", () => {
        util.testFunction`
            const { promise, resolve } = defer<string>();

            const returnedPromise = Promise.allSettled(["my literal", promise]);
            returnedPromise.then(([result1, result2]) => {
                log(result1, result2);
            });

            resolve("promise resolved!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                { status: "fulfilled", value: "my literal" },
                { status: "fulfilled", value: "promise resolved!" },
            ]);
    });

    test("returns resolved promise for empty argument list", () => {
        util.testFunction`
            const { state, value } = Promise.allSettled([]) as any;
            return { state, value };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 1, // __TS__PromiseState.Fulfilled
                value: [],
            });
    });
});

describe("Promise.any", () => {
    test("resolves once first promise resolves", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();
            const { promise: promise3, resolve: resolve3 } = defer<string>();

            const promise = Promise.any([promise1, promise2, promise3]);
            promise.then(data => {
                log(data);
            });

            resolve2("promise 2 result!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["promise 2 result!"]);
    });

    test("rejects once all promises reject", () => {
        util.testFunction`
            const { promise: promise1, reject: reject1 } = defer<string>();
            const { promise: promise2, reject: reject2 } = defer<string>();
            const { promise: promise3, reject: reject3 } = defer<string>();

            const promise = Promise.any([promise1, promise2, promise3]);
            promise.catch(reason => {
                log(reason);
            });

            reject2("promise 2 rejected!");
            reject3("promise 3 rejected!");
            reject1("promise 1 rejected!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                {
                    name: "AggregateError",
                    message: "All Promises rejected",
                    errors: ["promise 2 rejected!", "promise 3 rejected!", "promise 1 rejected!"],
                },
            ]);
    });

    test("handles already rejected promises", () => {
        util.testFunction`
            const { promise: promise1, reject: reject1 } = defer<string>();
            const { promise: promise2, reject: reject2 } = defer<string>();

            const promise = Promise.any([promise1, Promise.reject("already rejected!"), promise2]);
            promise.catch(reason => {
                log(reason);
            });

            reject2("promise 2 rejected!");
            reject1("promise 1 rejected!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual([
                {
                    name: "AggregateError",
                    message: "All Promises rejected",
                    errors: ["already rejected!", "promise 2 rejected!", "promise 1 rejected!"],
                },
            ]);
    });

    test("rejects if iterable is empty", () => {
        util.testFunction`
            const { state, rejectionReason } = Promise.any([]) as any;
            return { state, rejectionReason };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 2, // __TS__PromiseState.Rejected
                rejectionReason: "No promises to resolve with .any()",
            });
    });

    test("immediately resolves with literal", () => {
        util.testFunction`
            const { promise, resolve } = defer<string>();

            const { state, value } = Promise.any([promise, "my literal"]) as any;
            return { state, value };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 1, // __TS__PromiseState.Fulfilled
                value: "my literal",
            });
    });

    test("immediately resolves with resolved promise", () => {
        util.testFunction`
            const { promise, resolve } = defer<string>();

            const { state, value } = Promise.any([promise, Promise.resolve("my resolved promise")]) as any;
            return { state, value };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 1, // __TS__PromiseState.Fulfilled
                value: "my resolved promise",
            });
    });
});

describe("Promise.race", () => {
    test("resolves once first promise resolves", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();
            const { promise: promise3, resolve: resolve3 } = defer<string>();

            const promise = Promise.race([promise1, promise2, promise3]);
            promise.then(data => {
                log(data);
            });

            resolve2("promise 2 result!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["promise 2 result!"]);
    });

    test("rejects once first promise rejects", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, reject: reject2 } = defer<string>();
            const { promise: promise3, resolve: resolve3 } = defer<string>();

            const promise = Promise.race([promise1, promise2, promise3]);
            promise.catch(reason => {
                log(reason);
            });

            reject2("promise 2 rejected!");

            return allLogs;
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual(["promise 2 rejected!"]);
    });

    test("returns resolved promise if arguments contain resolved promise", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();

            const { state, value } = Promise.race([promise1, Promise.resolve("already resolved!"), promise2]) as any;
            return { state, value };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 1, // __TS__PromiseState.Fulfilled
                value: "already resolved!",
            });
    });

    test("returns resolved promise if arguments contain literal", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();

            const { state, value } = Promise.race([promise1, "my literal", promise2]) as any;
            return { state, value };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 1, // __TS__PromiseState.Fulfilled
                value: "my literal",
            });
    });

    test("returns rejected promise if arguments contain rejected promise", () => {
        util.testFunction`
            const { promise: promise1, resolve: resolve1 } = defer<string>();
            const { promise: promise2, resolve: resolve2 } = defer<string>();

            const { state, rejectionReason } = Promise.race([promise1, Promise.reject("already rejected!"), promise2]) as any;
            return { state, rejectionReason };
        `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 2, // __TS__PromiseState.Rejected
                rejectionReason: "already rejected!",
            });
    });

    test("returns forever pending promise if argument array is empty", () => {
        util.testFunction`
        const { state } = Promise.race([]) as any;
        return { state };
    `
            .setTsHeader(promiseTestLib)
            .expectToEqual({
                state: 0, // __TS__PromiseState.Pending
            });
    });
});
