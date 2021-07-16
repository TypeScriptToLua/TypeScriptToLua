// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
async function __TS__PromiseAny<T>(this: void, values: Array<T | PromiseLike<T>> | Iterable<T | PromiseLike<T>>): Promise<T> {

    const rejections: string[] = [];
    const pending: Array<PromiseLike<T>> = [];

    for (const value of values) {
        if (value instanceof __TS__Promise) {
            if (value.state === __TS__PromiseState.Fulfilled) {
                return Promise.resolve(value.value);
            } else if (value.state === __TS__PromiseState.Rejected) {
                rejections.push(value.rejectionReason);
            } else {
                pending.push(value);
            }
        } else {
            return Promise.resolve(value);
        }
    }

    if (pending.length === 0) {
        return Promise.reject("No promises to resolve with .any()");
    }

    let numResolved = 0;

    return new Promise((resolve, reject) => {
        for (const promise of pending) {
            promise.then(data => { resolve(data); },
            reason => {
                rejections.push(reason);
                numResolved++;
                if (numResolved === pending.length) {
                    reject({
                        name: "AggregateError",
                        message: "All Promises rejected",
                        errors: rejections
                    })
                }
            })
        }
    })
}
