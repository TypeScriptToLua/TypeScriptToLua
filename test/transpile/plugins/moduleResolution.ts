import path = require("path");
import type * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    moduleResolution(moduleIdentifier) {
        const modulePath = moduleIdentifier.replace(/\./g, path.sep);
        if (moduleIdentifier.includes("foo")) {
            return modulePath.replace("foo", "bar");
        }
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
