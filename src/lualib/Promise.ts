/* eslint-disable @typescript-eslint/promise-function-async */

// Promises implemented based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
// and https://promisesaplus.com/

export const enum PromiseState {
    Pending,
    Fulfilled,
    Rejected,
}

type FulfillCallback<TData, TResult> = (value: TData) => TResult | PromiseLike<TResult>;
type RejectCallback<TResult> = (reason: any) => TResult | PromiseLike<TResult>;

function promiseDeferred<T>() {
    let resolve: FulfillCallback<T, unknown>;
    let reject: RejectCallback<unknown>;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    // @ts-ignore This is alright because TS doesnt understand the callback will immediately be called
    return { promise, resolve, reject };
}

function isPromiseLike<T>(thing: unknown): thing is PromiseLike<T> {
    return thing instanceof __TS__Promise;
}

export class __TS__Promise<T> implements Promise<T> {
    public state = PromiseState.Pending;
    public value?: T;
    public rejectionReason?: any;

    private fulfilledCallbacks: Array<FulfillCallback<T, unknown>> = [];
    private rejectedCallbacks: Array<RejectCallback<unknown>> = [];
    private finallyCallbacks: Array<() => void> = [];

    // @ts-ignore
    public [Symbol.toStringTag]: string; // Required to implement interface, no output Lua

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve
    public static resolve<TData>(this: void, data: TData): Promise<TData> {
        // Create and return a promise instance that is already resolved
        const promise = new __TS__Promise<TData>(() => {});
        promise.state = PromiseState.Fulfilled;
        promise.value = data;
        return promise;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/reject
    public static reject(this: void, reason: any): Promise<never> {
        // Create and return a promise instance that is already rejected
        const promise = new __TS__Promise<never>(() => {});
        promise.state = PromiseState.Rejected;
        promise.rejectionReason = reason;
        return promise;
    }

    constructor(executor: (resolve: (data: T) => void, reject: (reason: any) => void) => void) {
        try {
            executor(this.resolve.bind(this), this.reject.bind(this));
        } catch (e) {
            // When a promise executor throws, the promise should be rejected with the thrown object as reason
            this.reject(e);
        }
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then
    public then<TResult1 = T, TResult2 = never>(
        onFulfilled?: FulfillCallback<T, TResult1>,
        onRejected?: RejectCallback<TResult2>
    ): Promise<TResult1 | TResult2> {
        const { promise, resolve, reject } = promiseDeferred<T | TResult1 | TResult2>();

        const isFulfilled = this.state === PromiseState.Fulfilled;
        const isRejected = this.state === PromiseState.Rejected;

        if (onFulfilled) {
            const internalCallback = this.createPromiseResolvingCallback(onFulfilled, resolve, reject);
            this.fulfilledCallbacks.push(internalCallback);

            if (isFulfilled) {
                // If promise already resolved, immediately call callback
                internalCallback(this.value!);
            }
        } else {
            // We always want to resolve our child promise if this promise is resolved, even if we have no handler
            this.fulfilledCallbacks.push(v => resolve(v));
        }

        if (onRejected) {
            const internalCallback = this.createPromiseResolvingCallback(onRejected, resolve, reject);
            this.rejectedCallbacks.push(internalCallback);

            if (isRejected) {
                // If promise already rejected, immediately call callback
                internalCallback(this.rejectionReason);
            }
        } else {
            // We always want to reject our child promise if this promise is rejected, even if we have no handler
            this.rejectedCallbacks.push(err => reject(err));
        }

        if (isFulfilled) {
            // If promise already resolved, also resolve returned promise
            resolve(this.value!);
        }

        if (isRejected) {
            // If promise already rejected, also reject returned promise
            reject(this.rejectionReason);
        }

        return promise as Promise<TResult1 | TResult2>;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch
    public catch<TResult = never>(onRejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<T | TResult> {
        return this.then(undefined, onRejected);
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally
    public finally(onFinally?: () => void): Promise<T> {
        if (onFinally) {
            this.finallyCallbacks.push(onFinally);

            if (this.state !== PromiseState.Pending) {
                // If promise already resolved or rejected, immediately fire finally callback
                onFinally();
            }
        }
        return this;
    }

    private resolve(data: T): void {
        if (data instanceof __TS__Promise) {
            data.then(
                v => this.resolve(v),
                err => this.reject(err)
            );
            return;
        }

        // Resolve this promise, if it is still pending. This function is passed to the constructor function.
        if (this.state === PromiseState.Pending) {
            this.state = PromiseState.Fulfilled;
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
        // Reject this promise, if it is still pending. This function is passed to the constructor function.
        if (this.state === PromiseState.Pending) {
            this.state = PromiseState.Rejected;
            this.rejectionReason = reason;

            for (const callback of this.rejectedCallbacks) {
                callback(reason);
            }
            for (const callback of this.finallyCallbacks) {
                callback();
            }
        }
    }

    private createPromiseResolvingCallback<TResult1, TResult2>(
        f: FulfillCallback<T, TResult1> | RejectCallback<TResult2>,
        resolve: FulfillCallback<TResult1 | TResult2, unknown>,
        reject: RejectCallback<unknown>
    ) {
        return (value: T) => {
            try {
                this.handleCallbackData(f(value), resolve, reject);
            } catch (e) {
                // If a handler function throws an error, the promise returned by then gets rejected with the thrown error as its value
                reject(e);
            }
        };
    }

    private handleCallbackData<TResult1, TResult2, TResult extends TResult1 | TResult2>(
        data: TResult | PromiseLike<TResult>,
        resolve: FulfillCallback<TResult1 | TResult2, unknown>,
        reject: RejectCallback<unknown>
    ) {
        if (isPromiseLike<TResult>(data)) {
            const nextpromise = data as __TS__Promise<TResult>;
            if (nextpromise.state === PromiseState.Fulfilled) {
                // If a handler function returns an already fulfilled promise,
                // the promise returned by then gets fulfilled with that promise's value
                resolve(nextpromise.value!);
            } else if (nextpromise.state === PromiseState.Rejected) {
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
}
