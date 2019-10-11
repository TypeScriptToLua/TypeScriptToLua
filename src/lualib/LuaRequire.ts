const tstlpackage = { preload: {}, loaded: {} };

function __TS__LuaRequire(this: void, moduleName: string): any {
    if (!tstlpackage.loaded[moduleName]) {
        const module: (this: void, module: string) => any = tstlpackage.preload[moduleName];
        if (module) {
            tstlpackage.loaded[moduleName] = module(moduleName);
        } else {
            // tslint:disable-next-line: no-string-throw
            throw `module '${moduleName}' not found:`;
        }
    }
    return tstlpackage.loaded[moduleName];
}
