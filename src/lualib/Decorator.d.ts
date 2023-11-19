export type Decorator<TTarget> = (target: TTarget, context: DecoratorContext) => TTarget;
