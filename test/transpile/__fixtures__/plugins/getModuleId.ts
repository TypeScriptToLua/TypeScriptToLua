import { createHash } from "crypto";
import * as path from "path";
import * as tstl from "../../../../src";

const plugin: tstl.Plugin = {
    getModuleId: (module, compilation) =>
        createHash("sha1")
            .update(module.source.toString())
            .update(path.relative(compilation.rootDir, module.fileName))
            .digest("hex"),
};

// eslint-disable-next-line import/no-default-export
export default plugin;
