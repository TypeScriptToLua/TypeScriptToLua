export type Decorator<TTarget extends AnyTable, TKey extends keyof TTarget> = (
    target: TTarget,
    key?: TKey,
    descriptor?: PropertyDescriptor
) => TTarget;
