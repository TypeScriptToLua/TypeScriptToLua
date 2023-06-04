/**
 * Old-style decorators, activated by enabling the experimentalDecorators flag
 */
import { __TS__ObjectGetOwnPropertyDescriptor } from "./ObjectGetOwnPropertyDescriptor";
import { __TS__SetDescriptor } from "./SetDescriptor";

export type LegacyDecorator<TTarget extends AnyTable, TKey extends keyof TTarget> = (
    target: TTarget,
    key?: TKey,
    descriptor?: PropertyDescriptor
) => TTarget;

export function __TS__DecorateLegacy<TTarget extends AnyTable, TKey extends keyof TTarget>(
    this: void,
    decorators: Array<LegacyDecorator<TTarget, TKey>>,
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
