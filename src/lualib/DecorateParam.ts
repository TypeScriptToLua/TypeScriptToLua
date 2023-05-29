import type { LegacyDecorator } from "./DecorateLegacy";

type ParamDecorator<TTarget extends AnyTable, TKey extends keyof TTarget> = (
    target: TTarget,
    key: TKey | undefined,
    index: number
) => TTarget;
export function __TS__DecorateParam<TTarget extends AnyTable, TKey extends keyof TTarget>(
    this: void,
    paramIndex: number,
    decorator: ParamDecorator<TTarget, TKey>
): LegacyDecorator<TTarget, TKey> {
    return (target: TTarget, key?: TKey) => decorator(target, key, paramIndex);
}
