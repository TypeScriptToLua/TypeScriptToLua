// @ts-expect-error Could not find a declaration file for module 'enhanced-resolve/lib/AliasPlugin'.
import * as AliasPlugin from "enhanced-resolve/lib/AliasPlugin";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    getResolvePlugins: () => [
        new AliasPlugin("described-resolve", { name: "foo", alias: "/bar.ts" }, "internal-resolve"),
    ],
};

// eslint-disable-next-line import/no-default-export
export default plugin;
