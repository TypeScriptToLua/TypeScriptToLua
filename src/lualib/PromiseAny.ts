// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
// eslint-disable-next-line @typescript-eslint/promise-function-async
function __TS__PromiseAny<T>(this: void, iterable: Iterable<T | PromiseLike<T>>): Promise<T> {
    const rejections: string[] = [];
    const pending: Array<PromiseLike<T>> = [];

    for (const item of iterable) {
        if (item instanceof __TS__Promise) {
            if (item.state === __TS__PromiseState.Fulfilled) {
                // If value is a resolved promise, return a new resolved promise with its value
                return Promise.resolve(item.value);
            } else if (item.state === __TS__PromiseState.Rejected) {
                // If value is a rejected promise, add its value to our list of rejections
                rejections.push(item.rejectionReason);
            } else {
                // If value is a pending promise, add it to the list of pending promises
                pending.push(item);
            }
        } else {
            // If value is not a promise, return a resolved promise with it as its value
            return Promise.resolve(item);
        }
    }

    // If we have not returned yet and there are no pending promises, reject
    if (pending.length === 0) {
        return Promise.reject("No promises to resolve with .any()");
    }

    let numResolved = 0;

    return new Promise((resolve, reject) => {
        for (const promise of pending) {
            promise.then(
                data => {
                    // If any pending promise resolves, resolve this promise with its data
                    resolve(data);
                },
                reason => {
                    // If a pending promise rejects, add its rejection to our rejection list
                    rejections.push(reason);
                    numResolved++;
                    if (numResolved === pending.length) {
                        // If there are no more pending promises, reject with the list of rejections
                        reject({
                            name: "AggregateError",
                            message: "All Promises rejected",
                            errors: rejections,
                        });
                    }
                }
            );
        }
    });
}
