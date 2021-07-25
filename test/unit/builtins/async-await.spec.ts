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

test("can return non-promise from async function", () => {
    util.testFunction`
        const { promise, resolve } = defer<string>();
        promise.then(data => log("resolving original promise", data));

        async function abc() {
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
});

test("can have multiple awaits in async function", () => {
    util.testFunction`
        const { promise: promise1, resolve: resolve1 } = defer<string>();
        const { promise: promise2, resolve: resolve2 } = defer<string>();
        const { promise: promise3, resolve: resolve3 } = defer<string>();
        promise1.then(data => log("resolving promise1", data));
        promise2.then(data => log("resolving promise2", data));
        promise3.then(data => log("resolving promise3", data));

        async function abc() {
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
