const ____modules: Record<string, (this: void, exports: object) => any> = {};
const ____modulecache: Record<string, any> = {};

function __TS__LuaRequire(this: void, moduleName: string): any {
    if (____modulecache[moduleName]) {
        return ____modulecache[moduleName];
    }
    const loadScript = ____modules[moduleName];
    if (!loadScript) {
        // tslint:disable-next-line: no-string-throw
        throw `module '${moduleName}' not found`;
    }
    const moduleExports = {};
    ____modulecache[moduleName] = moduleExports;
    ____modulecache[moduleName] = loadScript(moduleExports);
    return ____modulecache[moduleName];
}
