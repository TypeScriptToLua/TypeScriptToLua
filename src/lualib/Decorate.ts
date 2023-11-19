/**
 * TypeScript 5.0 decorators
 */
import { Decorator } from "./Decorator";

export function __TS__Decorate<TClass, TTarget>(
    this: TClass,
    originalValue: TTarget,
    decorators: Array<Decorator<TTarget>>,
    context: DecoratorContext
): TTarget {
    let result = originalValue;

    for (let i = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator !== undefined) {
            result = decorator.call(this, result, context) ?? result;
        }
    }

    return result;
}
