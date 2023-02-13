/**
 * SEE: https://github.com/Microsoft/TypeScript/blob/master/src/compiler/transformers/ts.ts#L3598
 */
import { __TS__ObjectGetOwnPropertyDescriptor } from "./ObjectGetOwnPropertyDescriptor";
import { __TS__SetDescriptor } from "./SetDescriptor";
import { Decorator } from "./Decorator";

export function __TS__Decorate<TTarget extends AnyTable, TKey extends keyof TTarget>(
    this: void,
    decorators: Array<Decorator<TTarget, TKey>>,
    target: TTarget,
    key?: TKey,
    desc?: any
): TTarget {
    let result = target;

    for (let i = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator !== undefined) {
            const oldResult = result;

            if (key === undefined) {
                result = decorator(result);
            } else if (desc === true) {
                const value = rawget(target, key);
                const descriptor = __TS__ObjectGetOwnPropertyDescriptor(target, key) ?? {
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
