/**
 * SEE: https://github.com/Microsoft/TypeScript/blob/master/src/compiler/transformers/ts.ts#L3598
 */
function __TS__Decorate(this: void, decorators: Function[], target: {}, key?: string, desc?: any): {} {
    let result = target;

    for (let i = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator) {
            const oldResult = result;

            if (key === undefined) {
                result = decorator(result);
            } else if (desc !== undefined) {
                result = decorator(target, key, result);
            } else {
                result = decorator(target, key);
            }

            result = result || oldResult;
        }
    }

    return result;
}
