import type * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    moduleResolution(moduleIdentifier) {
        if (moduleIdentifier.includes("foo")) {
            return moduleIdentifier.replace("foo", "bar");
        }
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
