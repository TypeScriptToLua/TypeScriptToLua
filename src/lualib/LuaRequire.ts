// tslint:disable: variable-name
const ____modules: Record<string, (this: void, exports: object) => any> = {};
const ____moduleCache: Record<string, any> = {};

function __TS__LuaRequire(this: void, moduleName: string): any {
    if (____moduleCache[moduleName]) {
        return ____moduleCache[moduleName];
    }
    const loadScript = ____modules[moduleName];
    if (!loadScript) {
        // tslint:disable-next-line: no-string-throw
        throw `module '${moduleName}' not found`;
    }
    const moduleExports = {};
    ____moduleCache[moduleName] = moduleExports;
    ____moduleCache[moduleName] = loadScript(moduleExports);
    return ____moduleCache[moduleName];
}
