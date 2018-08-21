import { LuaTranspilerJIT } from "./Transpiler.JIT";

import * as path from "path";

export class LuaTranspilerGLua extends LuaTranspilerJIT {
    /** @override */
    public getImportPath(relativePath: string): string {
        if (path.isAbsolute(relativePath)) {
            // Get Path relative to baseDir (baseDir should be set to /lua/)
            return `"${this.getAbsoluteImportPath(relativePath)}.lua"`;
        } else {
            // We can use realtive paths in gmod
            return `"${relativePath}.lua"`;
        }
    }

    /** @override */
    public getRequireKeyword(): string {
        return "include";
    }
}
