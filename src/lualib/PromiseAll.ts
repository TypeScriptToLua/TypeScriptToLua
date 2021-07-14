// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
async function __TS__PromiseAll<T>(this: void, values: Iterable<T | PromiseLike<T>>): Promise<T[]> {
    const results: T[] = [];

    const toResolve = new LuaTable<number, PromiseLike<T>>();
    let numToResolve = 0;

    let i = 0;
    for (const value of values) {
        if (value instanceof __TS__Promise) {
            if (value.state === __TS__PromiseState.Fulfilled) {
                results[i] = value.value;
            } else if (value.state === __TS__PromiseState.Rejected) {
                return Promise.reject(value.rejectionReason);
            } else {
                numToResolve++;
                toResolve.set(i, value);
            }
        } else {
            results[i] = value as T;
        }
        i++;
    }

    if (numToResolve === 0) {
        return Promise.resolve(results);
    }

    return new Promise((resolve, reject) => {
        for (const [index, promise] of pairs(toResolve)) {
            promise.then(
                data => {
                    // When resolved, store result and if there is nothing left to resolve, resolve the returned promise
                    results[index] = data;
                    numToResolve--;
                    if (numToResolve === 0) {
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
