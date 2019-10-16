const tstlpackage: {
    preload: Record<string, (this: void, exports: object) => object>;
    loaded: Record<string, object>;
} = { preload: {}, loaded: {} };

function __TS__LuaRequire(this: void, moduleName: string): any {
    if (tstlpackage.loaded[moduleName]) {
        return tstlpackage.loaded[moduleName];
    }
    const loadScript = tstlpackage.preload[moduleName];
    if (!loadScript) {
        // tslint:disable-next-line: no-string-throw
        throw `module '${moduleName}' not found`;
    }
    const moduleExports = {};
    tstlpackage.loaded[moduleName] = moduleExports;
    tstlpackage.loaded[moduleName] = loadScript(moduleExports);
    return tstlpackage.loaded[moduleName];
}
