import { createHash } from "crypto";
import * as path from "path";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    getModuleId: (module, transpilation) =>
        createHash("sha1")
            .update(module.code)
            .update(path.relative(transpilation.rootDir, module.request))
            .digest("hex"),
};

// eslint-disable-next-line import/no-default-export
export default plugin;
