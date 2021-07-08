import * as util from "../../util";

// Create a promise and store its resolve and reject functions, useful for testing
const defer = `function defer<T>() {
    let resolve: (data: any) => void = () => {};
    let reject: (reason: string) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}`;

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
        .setTsHeader(defer)
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
        .setTsHeader(defer)
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
            data => { result.push(data); },
            _ => {}
        );

        resolve("Hello!");
        resolve("World!"); // Second resolve should be ignored

        return result;
    `
        .setTsHeader(defer)
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
        .setTsHeader(defer)
        .expectToEqual(["Hello!"]);
});

test("promise cannot be resolved then rejected", () => {
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
        .setTsHeader(defer)
        .expectToEqual(["Hello!"]);
});

test("promise can be observed more than once", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();

        let result1: string | undefined;
        let result2: string | undefined;

        promise.then(
            data => { result1 = data; },
            _ => {}
        );

        promise.then(
            data => { result2 = data; },
            _ => {}
        );

        resolve("Hello!");

        return { result1, result2 };
    `
        .setTsHeader(defer)
        .expectToEqual({
            result1: "Hello!",
            result2: "Hello!",
        });
});
