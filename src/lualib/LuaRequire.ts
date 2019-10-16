const __TS__MODULES: Record<string, (this: void, exports: object) => any> = {};
const __TS__MODULECACHE: Record<string, any> = {};

function __TS__LuaRequire(this: void, moduleName: string): any {
    if (__TS__MODULECACHE[moduleName]) {
        return __TS__MODULECACHE[moduleName];
    }
    const loadScript = __TS__MODULES[moduleName];
    if (!loadScript) {
        // tslint:disable-next-line: no-string-throw
        throw `module '${moduleName}' not found`;
    }
    const moduleExports = {};
    __TS__MODULECACHE[moduleName] = moduleExports;
    __TS__MODULECACHE[moduleName] = loadScript(moduleExports);
    return __TS__MODULECACHE[moduleName];
}
