import type * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    moduleResolution(moduleIdentifier, requiringFile) {
        if (moduleIdentifier.includes("foo")) {
            return requiringFile.replace("foo", "bar");
        }
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
