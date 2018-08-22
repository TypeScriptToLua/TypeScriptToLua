import { LuaTranspilerJIT } from "./Transpiler.JIT";

import * as path from "path";
import * as ts from "typescript";

import { LuaTranspiler } from "../Transpiler";

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

    /** @override */
    public transpileDestructingAssignmentValue(node: ts.Expression): string {
        return LuaTranspiler.prototype.transpileDestructingAssignmentValue.call(this, node);
    }

    /** @override */
    public transpileSpreadElement(node: ts.SpreadElement): string {
        return LuaTranspiler.prototype.transpileSpreadElement.call(this, node);
    }
}
