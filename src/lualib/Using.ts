export function __TS__Using<TArgs extends Disposable[], TReturn>(
    this: undefined,
    cb: (this: void, ...args: TArgs) => TReturn,
    ...args: TArgs
): TReturn {
    let thrownError;
    const [ok, result] = xpcall(
        () => cb(...args),
        err => (thrownError = err)
    );

    const argArray = [...args];
    for (let i = argArray.length - 1; i >= 0; i--) {
        argArray[i][Symbol.dispose]();
    }

    if (!ok) {
        throw thrownError;
    }

    return result;
}
