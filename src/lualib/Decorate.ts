/**
 * SEE: https://github.com/Microsoft/TypeScript/blob/master/src/compiler/transformers/ts.ts#L3598
 */
function __TS__Decorate(this: void, decorators: Function[], target: any, key?: string, desc?: any): {} {
    let result = target;

    for (let i = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator) {
            const oldResult = result;

            if (key === undefined) {
                result = decorator(result);
            } else if (desc === true) {
                const value = rawget(target, key);
                let descriptor: PropertyDescriptor;
                if (value === undefined) {
                    descriptor = __TS__ObjectGetOwnPropertyDescriptor(target, key);
                } else {
                    [descriptor] = __TS__CloneDescriptor({ configurable: true, writable: true, value });
                }
                __TS__SetDescriptor(target, key, { ...descriptor, ...decorator(target, key, descriptor) });
            } else if (desc === false) {
                result = decorator(target, key, desc);
            } else {
                result = decorator(target, key);
            }

            result = result || oldResult;
        }
    }

    return result;
}
