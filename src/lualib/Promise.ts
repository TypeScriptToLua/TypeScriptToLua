/* eslint-disable @typescript-eslint/promise-function-async */

// Promises implemented based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
// and https://promisesaplus.com/

export const enum PromiseState {
    Pending,
    Fulfilled,
    Rejected,
}

type PromiseExecutor<T> = ConstructorParameters<typeof Promise<T>>[0];
type PromiseResolve<T> = Parameters<PromiseExecutor<T>>[0];
type PromiseReject = Parameters<PromiseExecutor<unknown>>[1];
type PromiseResolveCallback<TValue, TResult> = (value: TValue) => TResult | PromiseLike<TResult>;
type PromiseRejectCallback<TResult> = (reason: any) => TResult | PromiseLike<TResult>;

function makeDeferredPromiseFactory(this: void) {
    let resolve: PromiseResolve<any>;
    let reject: PromiseReject;
    const executor: PromiseExecutor<any> = (res, rej) => {
        resolve = res;
        reject = rej;
    };
    return function <T>(this: void) {
        const promise = new Promise<T>(executor);
        return $multi(promise, resolve, reject);
    };
}

const makeDeferredPromise = makeDeferredPromiseFactory();

function isPromiseLike<T>(this: void, value: unknown): value is PromiseLike<T> {
    return value instanceof __TS__Promise;
}

function doNothing(): void {}

const pcall = _G.pcall;

export class __TS__Promise<T> implements Promise<T> {
    public state = PromiseState.Pending;
    public value?: T;
    public rejectionReason?: any;

    private fulfilledCallbacks: Array<PromiseResolve<T>> = [];
    private rejectedCallbacks: PromiseReject[] = [];
    private finallyCallbacks: Array<() => void> = [];

    // @ts-ignore
    public [Symbol.toStringTag]: string; // Required to implement interface, no output Lua

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve
    public static resolve<T>(this: void, value: T | PromiseLike<T>): __TS__Promise<Awaited<T>> {
        if (value instanceof __TS__Promise) {
            return value;
        }
        // Create and return a promise instance that is already resolved
        const promise = new __TS__Promise<Awaited<T>>(doNothing);
        promise.state = PromiseState.Fulfilled;
        promise.value = value as Awaited<T>;
        return promise;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/reject
    public static reject<T = never>(this: void, reason?: any): __TS__Promise<T> {
        // Create and return a promise instance that is already rejected
        const promise = new __TS__Promise<T>(doNothing);
        promise.state = PromiseState.Rejected;
        promise.rejectionReason = reason;
        return promise;
    }

    constructor(executor: PromiseExecutor<T>) {
        // Avoid unnecessary local functions allocations by using `pcall` explicitly
        const [success, error] = pcall(
            executor,
            undefined,
            v => this.resolve(v),
            err => this.reject(err)
        );
        if (!success) {
            // When a promise executor throws, the promise should be rejected with the thrown object as reason
            this.reject(error);
        }
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then
    public then<TResult1 = T, TResult2 = never>(
        onFulfilled?: PromiseResolveCallback<T, TResult1>,
        onRejected?: PromiseRejectCallback<TResult2>
    ): Promise<TResult1 | TResult2> {
        const [promise, resolve, reject] = makeDeferredPromise<T | TResult1 | TResult2>();

        this.addCallbacks(
            // We always want to resolve our child promise if this promise is resolved, even if we have no handler
            onFulfilled ? this.createPromiseResolvingCallback(onFulfilled, resolve, reject) : resolve,
            // We always want to reject our child promise if this promise is rejected, even if we have no handler
            onRejected ? this.createPromiseResolvingCallback(onRejected, resolve, reject) : reject
        );

        return promise as Promise<TResult1 | TResult2>;
    }

    // Both callbacks should never throw!
    public addCallbacks(fulfilledCallback: (value: T) => void, rejectedCallback: (rejectionReason: any) => void): void {
        if (this.state === PromiseState.Fulfilled) {
            // If promise already resolved, immediately call callback. We don't even need to store rejected callback
            // Tail call return is important!
            return fulfilledCallback(this.value!);
        }
        if (this.state === PromiseState.Rejected) {
            // Similar thing
            return rejectedCallback(this.rejectionReason);
        }

        this.fulfilledCallbacks.push(fulfilledCallback as any);
        this.rejectedCallbacks.push(rejectedCallback);
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

    private resolve(value: T | PromiseLike<T>): void {
        if (isPromiseLike(value)) {
            // Tail call return is important!
            return (value as __TS__Promise<T>).addCallbacks(
                v => this.resolve(v),
                err => this.reject(err)
            );
        }

        // Resolve this promise, if it is still pending. This function is passed to the constructor function.
        if (this.state === PromiseState.Pending) {
            this.state = PromiseState.Fulfilled;
            this.value = value;

            // Tail call return is important!
            return this.invokeCallbacks(this.fulfilledCallbacks, value);
        }
    }

    private reject(reason: any): void {
        // Reject this promise, if it is still pending. This function is passed to the constructor function.
        if (this.state === PromiseState.Pending) {
            this.state = PromiseState.Rejected;
            this.rejectionReason = reason;

            // Tail call return is important!
            return this.invokeCallbacks(this.rejectedCallbacks, reason);
        }
    }

    private invokeCallbacks<T>(callbacks: ReadonlyArray<(value: T) => void>, value: T): void {
        const callbacksLength = callbacks.length;
        const finallyCallbacks = this.finallyCallbacks;
        const finallyCallbacksLength = finallyCallbacks.length;

        if (callbacksLength !== 0) {
            for (const i of $range(1, callbacksLength - 1)) {
                callbacks[i - 1](value);
            }
            // Tail call optimization for a common case.
            if (finallyCallbacksLength === 0) {
                return callbacks[callbacksLength - 1](value);
            }
            callbacks[callbacksLength - 1](value);
        }

        if (finallyCallbacksLength !== 0) {
            for (const i of $range(1, finallyCallbacksLength - 1)) {
                finallyCallbacks[i - 1]();
            }
            return finallyCallbacks[finallyCallbacksLength - 1]();
        }
    }

    private createPromiseResolvingCallback<TResult1, TResult2>(
        f: PromiseResolveCallback<T, TResult1> | PromiseRejectCallback<TResult2>,
        resolve: (data: TResult1 | TResult2) => void,
        reject: (reason: any) => void
    ) {
        return (value: T): void => {
            const [success, resultOrError] = pcall<
                undefined,
                [T],
                TResult1 | PromiseLike<TResult1> | TResult2 | PromiseLike<TResult2>
            >(f, undefined, value);
            if (!success) {
                // Tail call return is important!
                return reject(resultOrError);
            }
            // Tail call return is important!
            return this.handleCallbackValue(resultOrError, resolve, reject);
        };
    }

    private handleCallbackValue<TResult1, TResult2, TResult extends TResult1 | TResult2>(
        value: TResult | PromiseLike<TResult>,
        resolve: (data: TResult1 | TResult2) => void,
        reject: (reason: any) => void
    ): void {
        if (isPromiseLike<TResult>(value)) {
            const nextpromise = value as __TS__Promise<TResult>;
            if (nextpromise.state === PromiseState.Fulfilled) {
                // If a handler function returns an already fulfilled promise,
                // the promise returned by then gets fulfilled with that promise's value.
                // Tail call return is important!
                return resolve(nextpromise.value!);
            } else if (nextpromise.state === PromiseState.Rejected) {
                // If a handler function returns an already rejected promise,
                // the promise returned by then gets fulfilled with that promise's value.
                // Tail call return is important!
                return reject(nextpromise.rejectionReason);
            } else {
                // If a handler function returns another pending promise object, the resolution/rejection
                // of the promise returned by then will be subsequent to the resolution/rejection of
                // the promise returned by the handler.
                // We cannot use `then` because we need to do tail call, and `then` returns a Promise.
                // `resolve` and `reject` should never throw.
                return nextpromise.addCallbacks(resolve, reject);
            }
        } else {
            // If a handler returns a value, the promise returned by then gets resolved with the returned value as its value
            // If a handler doesn't return anything, the promise returned by then gets resolved with undefined
            // Tail call return is important!
            return resolve(value);
        }
    }
}
