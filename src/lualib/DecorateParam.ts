function __TS__DecorateParam(this: void, paramIndex: number, decorator: Function): {} {
    return (target: Function, key?: string) => decorator(target, key, paramIndex);
}
