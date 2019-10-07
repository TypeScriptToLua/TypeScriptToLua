globalThis.package = {};
globalThis.package.preload = {};
globalThis.package.loaded = {};

function __TS__LuaRequire(this: void, moduleName: string): any {
    if (!globalThis.package.loaded[moduleName]) {
        const module: (this: void, module: string) => any = globalThis.package.preload[moduleName];
        if (module) {
            globalThis.package.loaded[moduleName] = module(moduleName);
        } else {
            // tslint:disable-next-line: no-string-throw
            throw `module '${moduleName}' not found:`;
        }
    }
    return globalThis.package.loaded[moduleName];
}
