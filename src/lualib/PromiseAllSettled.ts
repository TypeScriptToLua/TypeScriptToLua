// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
async function __TS__PromiseAllSettled<T>(
    this: void,
    values: Iterable<T>
): Promise<Array<PromiseSettledResult<T extends PromiseLike<infer U> ? U : T>>> {
    const results: Array<PromiseSettledResult<T extends PromiseLike<infer U> ? U : T>> = [];

    const toResolve = new LuaTable<number, PromiseLike<T>>();
    let numToResolve = 0;

    let i = 0;
    for (const value of values) {
        if (value instanceof __TS__Promise) {
            if (value.state === __TS__PromiseState.Fulfilled) {
                // If value is a resolved promise, add a fulfilled PromiseSettledResult
                results[i] = { status: "fulfilled", value: value.value };
            } else if (value.state === __TS__PromiseState.Rejected) {
                // If value is a rejected promise, add a rejected PromiseSettledResult
                results[i] = { status: "rejected", reason: value.rejectionReason };
            } else {
                // If value is a pending promise, add it to the list of pending promises
                numToResolve++;
                toResolve.set(i, value);
            }
        } else {
            // If value is not a promise, add it to the results as fulfilled PromiseSettledResult
            results[i] = { status: "fulfilled", value: value as any };
        }
        i++;
    }

    // If there are no remaining pending promises, return a resolved promise with the results
    if (numToResolve === 0) {
        return Promise.resolve(results);
    }

    return new Promise(resolve => {
        for (const [index, promise] of pairs(toResolve)) {
            promise.then(
                data => {
                    // When resolved, add a fulfilled PromiseSettledResult
                    results[index] = { status: "fulfilled", value: data as any };
                    numToResolve--;
                    if (numToResolve === 0) {
                        // If there are no more promises to resolve, resolve with our filled results array
                        resolve(results);
                    }
                },
                reason => {
                    // When resolved, add a rejected PromiseSettledResult
                    results[index] = { status: "rejected", reason };
                    numToResolve--;
                    if (numToResolve === 0) {
                        // If there are no more promises to resolve, resolve with our filled results array
                        resolve(results);
                    }
                }
            );
        }
    });
}
