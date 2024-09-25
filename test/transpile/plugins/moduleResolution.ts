import path = require("path");
import type * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    moduleResolution(moduleIdentifier) {
        if (moduleIdentifier.includes("absolutefoo")) {
            return path.join(
                path.dirname(__dirname),
                "module-resolution",
                "project-with-module-resolution-plugin",
                "lua_sources",
                "absolutebar.lua"
            );
        }

        if (moduleIdentifier.includes("foo")) {
            return moduleIdentifier.replace("foo", "bar");
        }
    },
};

export default plugin;
