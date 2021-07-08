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
    private state = __TS__PromiseState.Pending;
    private value?: T;

    private fulfilledCallbacks: Array<FulfillCallback<T, unknown>> = [];
    private rejectedCallbacks: Array<RejectCallback<unknown>> = [];
    private finallyCallbacks: Array<() => void> = [];

    public [Symbol.toStringTag]: string;

    constructor(private executor: (resolve: (data: T) => void, reject: (reason: string) => void) => void) {
        this.execute();
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: FulfillCallback<T, TResult1>,
        onrejected?: RejectCallback<TResult2>
    ): Promise<TResult1 | TResult2> {
        const { promise, resolve, reject } = __TS__PromiseDeferred<TResult1 | TResult2>();

        function handleCallbackData<TResult extends TResult1 | TResult2>(data: TResult | PromiseLike<TResult>) {
            if (__TS__IsPromiseLike<TResult>(data)) {
                const nextpromise = data as __TS__Promise<TResult>;
                if (nextpromise.state === __TS__PromiseState.Fulfilled) {
                    resolve(nextpromise.value);
                } else if (nextpromise.state === __TS__PromiseState.Rejected) {
                    reject(nextpromise.value);
                } else {
                    nextpromise.then(resolve, reject);
                }
            } else {
                resolve(data);
            }
        }

        if (onfulfilled) {
            if (this.fulfilledCallbacks.length === 0) {
                this.fulfilledCallbacks.push(value => {
                    handleCallbackData(onfulfilled(value));
                });
            } else {
                this.fulfilledCallbacks.push(onfulfilled);
            }
        }
        if (onrejected) {
            if (this.rejectedCallbacks.length === 0) {
                this.rejectedCallbacks.push(value => {
                    handleCallbackData(onrejected(value));
                });
            } else {
                this.rejectedCallbacks.push(onrejected);
            }
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

    private execute(): void {
        this.executor(this.resolve.bind(this), this.reject.bind(this));
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

    private reject(reason: string): void {
        if (this.state === __TS__PromiseState.Pending) {
            this.state = __TS__PromiseState.Rejected;
            for (const callback of this.rejectedCallbacks) {
                callback(reason);
            }
            for (const callback of this.finallyCallbacks) {
                callback();
            }
        }
    }
}
