// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race
// eslint-disable-next-line @typescript-eslint/promise-function-async
function __TS__PromiseRace<T>(this: void, iterable: Iterable<T | PromiseLike<T>>): Promise<T> {
    const pending: Array<PromiseLike<T>> = [];

    for (const item of iterable) {
        if (item instanceof __TS__Promise) {
            if (item.state === __TS__PromiseState.Fulfilled) {
                // If value is a fulfilled promise, return a resolved promise with its value
                return Promise.resolve(item.value);
            } else if (item.state === __TS__PromiseState.Rejected) {
                // If value is a rejected promise, return rejected promise with its value
                return Promise.reject(item.rejectionReason);
            } else {
                // If value is a pending promise, add it to the list of pending promises
                pending.push(item);
            }
        } else {
            // If value is not a promise, return a promise resolved with it as its value
            return Promise.resolve(item);
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
