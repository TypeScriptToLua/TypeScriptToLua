// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
// eslint-disable-next-line @typescript-eslint/promise-function-async
function __TS__PromiseAll<T>(this: void, iterable: Iterable<T | PromiseLike<T>>): Promise<T[]> {
    const results: T[] = [];

    const toResolve = new LuaTable<number, PromiseLike<T>>();
    let numToResolve = 0;

    let i = 0;
    for (const item of iterable) {
        if (item instanceof __TS__Promise) {
            if (item.state === __TS__PromiseState.Fulfilled) {
                // If value is a resolved promise, add its value to our results array
                results[i] = item.value;
            } else if (item.state === __TS__PromiseState.Rejected) {
                // If value is a rejected promise, return a rejected promise with the rejection reason
                return Promise.reject(item.rejectionReason);
            } else {
                // If value is a pending promise, add it to the list of pending promises
                numToResolve++;
                toResolve.set(i, item);
            }
        } else {
            // If value is not a promise, add it to the results array
            results[i] = item as T;
        }
        i++;
    }

    // If there are no remaining pending promises, return a resolved promise with the results
    if (numToResolve === 0) {
        return Promise.resolve(results);
    }

    return new Promise((resolve, reject) => {
        for (const [index, promise] of pairs(toResolve)) {
            promise.then(
                data => {
                    // When resolved, store value in results array
                    results[index] = data;
                    numToResolve--;
                    if (numToResolve === 0) {
                        // If there are no more promises to resolve, resolve with our filled results  array
                        resolve(results);
                    }
                },
                reason => {
                    // When rejected, immediately reject the returned promise
                    reject(reason);
                }
            );
        }
    });
}
