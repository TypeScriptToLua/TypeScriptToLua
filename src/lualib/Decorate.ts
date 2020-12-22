/**
 * SEE: https://github.com/Microsoft/TypeScript/blob/master/src/compiler/transformers/ts.ts#L3598
 */
function __TS__Decorate(this: void, decorators: Function[], target: any, key?: any, desc?: any): {} {
    let result = target;

    for (let i = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator) {
            const oldResult = result;

            if (key === undefined) {
                result = decorator(result);
            } else if (desc === true) {
                const value = rawget(target, key);
                const descriptor = __TS__ObjectGetOwnPropertyDescriptor(target, key) || {
                    configurable: true,
                    writable: true,
                    value,
                };
                const desc = decorator(target, key, descriptor) || descriptor;
                const isSimpleValue = desc.configurable === true && desc.writable === true && !desc.get && !desc.set;
                if (isSimpleValue) {
                    rawset(target, key, desc.value);
                } else {
                    __TS__SetDescriptor(target, key, { ...descriptor, ...desc });
                }
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
