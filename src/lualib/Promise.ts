/* eslint-disable @typescript-eslint/promise-function-async */

// Promises implemented based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
// and https://promisesaplus.com/

enum __TS__PromiseState {
    Pending,
    Fulfilled,
    Rejected,
}

type FulfillCallback<TData, TResult> = (value: TData) => TResult | PromiseLike<TResult>;
type RejectCallback<TResult> = (reason: any) => TResult | PromiseLike<TResult>;

function __TS__PromiseDeferred<T>() {
    let resolve: FulfillCallback<T, unknown>;
    let reject: RejectCallback<unknown>;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

function __TS__IsPromiseLike<T>(thing: unknown): thing is PromiseLike<T> {
    return thing instanceof __TS__Promise;
}

class __TS__Promise<T> implements Promise<T> {
    public state = __TS__PromiseState.Pending;
    public value?: T;
    public rejectionReason?: any;

    private fulfilledCallbacks: Array<FulfillCallback<T, unknown>> = [];
    private rejectedCallbacks: Array<RejectCallback<unknown>> = [];
    private finallyCallbacks: Array<() => void> = [];

    public [Symbol.toStringTag]: string; // Required to implement interface, no output Lua

    public static resolve<TData>(this: void, data: TData): Promise<TData> {
        // Create and return a promise instance that is already resolved
        const promise = new __TS__Promise<TData>(() => {});
        promise.state = __TS__PromiseState.Fulfilled;
        promise.value = data;
        return promise;
    }

    public static reject(this: void, reason: any): Promise<never> {
        // Create and return a promise instance that is already rejected
        const promise = new __TS__Promise<never>(() => {});
        promise.state = __TS__PromiseState.Rejected;
        promise.rejectionReason = reason;
        return promise;
    }

    constructor(executor: (resolve: (data: T) => void, reject: (reason: any) => void) => void) {
        executor(this.resolve.bind(this), this.reject.bind(this));
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: FulfillCallback<T, TResult1>,
        onrejected?: RejectCallback<TResult2>
    ): Promise<TResult1 | TResult2> {
        const { promise, resolve, reject } = __TS__PromiseDeferred<TResult1 | TResult2>();

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then#return_value
        function returnedPromiseHandler(f: FulfillCallback<T, TResult1> | RejectCallback<TResult2>) {
            return value => {
                try {
                    handleCallbackData(f(value));
                } catch (e) {
                    // If a handler function throws an error, the promise returned by then gets rejected with the thrown error as its value
                    reject(e);
                }
            }
        }
        function handleCallbackData<TResult extends TResult1 | TResult2>(data: TResult | PromiseLike<TResult>) {
            if (__TS__IsPromiseLike<TResult>(data)) {
                const nextpromise = data as __TS__Promise<TResult>;
                if (nextpromise.state === __TS__PromiseState.Fulfilled) {
                    // If a handler function returns an already fulfilled promise,
                    // the promise returned by then gets fulfilled with that promise's value
                    resolve(nextpromise.value);
                } else if (nextpromise.state === __TS__PromiseState.Rejected) {
                    // If a handler function returns an already rejected promise,
                    // the promise returned by then gets fulfilled with that promise's value
                    reject(nextpromise.rejectionReason);
                } else {
                    // If a handler function returns another pending promise object, the resolution/rejection
                    // of the promise returned by then will be subsequent to the resolution/rejection of
                    // the promise returned by the handler.
                    data.then(resolve, reject);
                }
            } else {
                // If a handler returns a value, the promise returned by then gets resolved with the returned value as its value
                // If a handler doesn't return anything, the promise returned by then gets resolved with undefined
                resolve(data);
            }
        }

        if (onfulfilled) {
            this.fulfilledCallbacks.push(
                this.fulfilledCallbacks.length === 0 ? returnedPromiseHandler(onfulfilled) : onfulfilled
            );
        }
        if (onrejected) {
            this.rejectedCallbacks.push(
                this.rejectedCallbacks.length === 0 ? returnedPromiseHandler(onrejected) : onrejected
            );
        }
        return promise;
    }
    public catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<T | TResult> {
        return this.then(undefined, onrejected);
    }
    public finally(onfinally?: () => void): Promise<T> {
        if (onfinally) {
            this.finallyCallbacks.push(onfinally);
        }
        return this;
    }

    private resolve(data: T): void {
        if (this.state === __TS__PromiseState.Pending) {
            this.state = __TS__PromiseState.Fulfilled;
            this.value = data;

            for (const callback of this.fulfilledCallbacks) {
                callback(data);
            }
            for (const callback of this.finallyCallbacks) {
                callback();
            }
        }
    }

    private reject(reason: any): void {
        if (this.state === __TS__PromiseState.Pending) {
            this.state = __TS__PromiseState.Rejected;
            this.rejectionReason = reason;

            for (const callback of this.rejectedCallbacks) {
                callback(reason);
            }
            for (const callback of this.finallyCallbacks) {
                callback();
            }
        }
    }
}
