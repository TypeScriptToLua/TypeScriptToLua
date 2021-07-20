// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race
async function __TS__PromiseRace<T>(this: void, values: Iterable<T | PromiseLike<T>>): Promise<T> {
    const pending: Array<PromiseLike<T>> = [];

    for (const value of values) {
        if (value instanceof __TS__Promise) {
            if (value.state === __TS__PromiseState.Fulfilled) {
                // If value is a fulfilled promise, return a resolved promise with its value
                return Promise.resolve(value.value);
            } else if (value.state === __TS__PromiseState.Rejected) {
                // If value is a rejected promise, return rejected promise with its value
                return Promise.reject(value.rejectionReason);
            } else {
                // If value is a pending promise, add it to the list of pending promises
                pending.push(value);
            }
        } else {
            // If value is not a promise, return a promise resolved with it as its value
            return Promise.resolve(value);
        }
    }

    // If not yet returned, wait for any pending promise to resolve or reject.
    // If there are no pending promise, this promise will be pending forever as per specification.
    return new Promise((resolve, reject) => {
        for (const promise of pending) {
            promise.then(
                value => resolve(value),
                reason => reject(reason)
            );
        }
    });
}
