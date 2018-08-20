import { LuaTranspiler } from "../Transpiler";

import * as path from "path";

export class LuaTranspilerGLua extends LuaTranspiler {
    /** @override */
    public getImportPath(relativePath: string): string {
        if (path.isAbsolute(relativePath)) {
            // Get Path relative to baseDir (baseDir should be set to /lua/)
            return `"${this.getAbsoluteImportPath(relativePath)}"`;
        } else {
            // We can use realtive paths in gmod
            return `"${this.pathToLuaRequirePath(relativePath)}"`;
        }
    }

    /** @override */
    public getRequireKeyword(): string {
        return "include";
    }
}
