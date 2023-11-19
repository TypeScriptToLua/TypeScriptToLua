export async function __TS__UsingAsync<TArgs extends Array<Disposable | AsyncDisposable>, TReturn>(
    this: undefined,
    cb: (...args: TArgs) => TReturn,
    ...args: TArgs
): Promise<TReturn> {
    let thrownError;
    const [ok, result] = xpcall(
        () => cb(...args),
        err => (thrownError = err)
    );

    const argArray = [...args];
    for (let i = argArray.length - 1; i >= 0; i--) {
        if (Symbol.dispose in argArray[i]) {
            (argArray[i] as Disposable)[Symbol.dispose]();
        }
        if (Symbol.asyncDispose in argArray[i]) {
            await (argArray[i] as AsyncDisposable)[Symbol.asyncDispose]();
        }
    }

    if (!ok) {
        throw thrownError;
    }

    return result;
}
