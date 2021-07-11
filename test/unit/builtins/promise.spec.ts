import * as util from "../../util";

// Create a promise and store its resolve and reject functions, useful for testing
const deferPromise = `function defer<T>() {
    let resolve: (data: any) => void = () => {};
    let reject: (reason: string) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}`;

test("can create resolved promise", () => {
    util.testExpression`Promise.resolve(42)`.expectNoExecutionError();
});

test("can create rejected promise", () => {
    util.testExpression`Promise.reject(42)`.expectNoExecutionError();
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
        .setTsHeader(deferPromise)
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
        .setTsHeader(deferPromise)
        .expectToEqual({
            beforeReject: undefined,
            afterReject: "Hello!",
            resolveResult: undefined,
        });
});

test("promise cannot be resolved more than once", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        let result: string[] = [];

        promise.then(
            data => { result.push(data); }
        );

        resolve("Hello!");
        resolve("World!"); // Second resolve should be ignored

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["Hello!"]);
});

test("promise cannot be rejected more than once", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        let result: string[] = [];

        promise.then(
            _ => {},
            reason => { result.push(reason); }
        );

        reject("Hello!");
        reject("World!"); // Second reject should be ignored

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["Hello!"]);
});

test("promise cannot be rejected after resolving", () => {
    util.testFunction`
        const { promise, resolve, reject } = defer<string>();

        let result: string[] = [];

        promise.then(
            data => { result.push(data); },
            reason => { result.push(reason); }
        );

        resolve("Hello!");
        reject("World!"); // should be ignored because already resolved

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["Hello!"]);
});

test("promise cannot be resolved after rejecting", () => {
    util.testFunction`
        const { promise, resolve, reject } = defer<string>();

        let result: string[] = [];

        promise.then(
            data => { result.push(data); },
            reason => { result.push(reason); }
        );

        reject("Hello!");
        resolve("World!"); // should be ignored because already rejected

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["Hello!"]);
});

test("promise can be (then-resolve) observed more than once", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const result = [];

        promise.then(
            data => { result.push("then 1: " + data); }
        );

        promise.then(
            data => { result.push("then 2: " + data); }
        );

        resolve("Hello!");

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["then 1: Hello!", "then 2: Hello!"]);
});

test("promise can be (then-reject) observed more than once", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        const result = [];

        promise.then(
            undefined,
            reason => { result.push("then 1: " + reason); }
        );

        promise.then(
            undefined,
            reason => { result.push("then 2: " + reason); },
        );

        reject("Hello!");

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["then 1: Hello!", "then 2: Hello!"]);
});

test("promise can be (catch) observed more than once", () => {
    util.testFunction`
        const { promise, reject } = defer<string>();

        const result = [];

        promise.catch(
            reason => { result.push("catch 1: " + reason); }
        );

        promise.catch(
            reason => { result.push("catch 2: " + reason); },
        );

        reject("Hello!");

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["catch 1: Hello!", "catch 2: Hello!"]);
});

test("promise chained resolve resolves all", () => {
    util.testFunction`
        const { promise: promise1, resolve: resolve1 } = defer<string>();
        const { promise: promise2, resolve: resolve2 } = defer<string>();
        const { promise: promise3, resolve: resolve3 } = defer<string>();

        const result = [];

        promise3.then(data => {
            result.push("promise3: " + data);
            resolve2(data);
        });
        promise2.then(data => {
            result.push("promise2: " + data);
            resolve1(data);
        });
        promise1.then(data => {
            result.push("promise1: " + data);
        });

        resolve3("Hello!");

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["promise3: Hello!", "promise2: Hello!", "promise1: Hello!"]);
});

test("promise then returns a literal", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const result = []

        const promise2 = promise.then(data => {
            result.push("promise resolved with: " + data);
            return "promise 1 resolved: " + data;
        });

        promise2.then(data => {
            result.push("promise2 resolved with: " + data);
        });

        resolve("Hello!");

        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["promise resolved with: Hello!", "promise2 resolved with: promise 1 resolved: Hello!"]);
});

test("promise then returns a resolved promise", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const result = []

        const promise2 = promise.then(data => {
            result.push("promise resolved with: " + data);
            return Promise.resolve("promise 1 resolved: " + data);
        });

        promise2.then(data => {
            result.push("promise2 resolved with: " + data);
        });

        resolve("Hello!");
        
        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["promise3: Hello!", "promise2: Hello!", "promise1: Hello!"]);
});

test("promise then returns a rejected promise", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        const result = []

        const promise2 = promise.then(data => {
            result.push("promise resolved with: " + data);
            return Promise.reject("reject!");
        });

        promise2.catch(reason => {
            result.push("promise2 rejected with: " + reason);
        });

        resolve("Hello!");
        
        return result;
    `
        .setTsHeader(deferPromise)
        .expectToEqual(["promise3: Hello!", "promise2: Hello!", "promise1: Hello!"]);
});
