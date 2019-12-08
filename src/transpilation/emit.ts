import * as path from "path";
import * as ts from "typescript";
import { LuaLibImportKind } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { normalizeSlashes, trimExtension } from "../utils";
import { EmitHost, TranspiledFile } from "./transpile";

export interface OutputFile {
    name: string;
    text: string;
}

export function emitTranspiledFiles(
    program: ts.Program,
    transpiledFiles: TranspiledFile[],
    emitHost: EmitHost = ts.sys
): OutputFile[] {
    const options = program.getCompilerOptions();
    let { outDir, luaLibImport, luaBundle } = options;

    const rootDir = program.getCommonSourceDirectory();
    outDir = outDir ?? rootDir;

    const files: OutputFile[] = [];
    for (const { fileName, lua, sourceMap, declaration, declarationMap } of transpiledFiles) {
        let outPath = fileName;
        if (outDir !== rootDir) {
            outPath = path.resolve(outDir, path.relative(rootDir, fileName));
        }

        // change extension
        outPath = normalizeSlashes(trimExtension(outPath) + ".lua");

        if (lua !== undefined) {
            files.push({ name: outPath, text: lua });
        }

        if (sourceMap !== undefined && options.sourceMap) {
            files.push({ name: outPath + ".map", text: sourceMap });
        }

        if (declaration !== undefined) {
            files.push({ name: trimExtension(outPath) + ".d.ts", text: declaration });
        }

        if (declarationMap !== undefined) {
            files.push({ name: trimExtension(outPath) + ".d.ts.map", text: declarationMap });
        }
    }

    if (
        !luaBundle &&
        (luaLibImport === undefined ||
            luaLibImport === LuaLibImportKind.Require ||
            luaLibImport === LuaLibImportKind.Always)
    ) {
        const lualibRequired = files.some(f => f.text?.includes(`require("lualib_bundle")`));
        if (lualibRequired) {
            let outPath = path.resolve(rootDir, "lualib_bundle.lua");
            if (outDir !== rootDir) {
                outPath = path.join(outDir, path.relative(rootDir, outPath));
            }

            files.push({ name: normalizeSlashes(outPath), text: getLuaLibBundle(emitHost) });
        }
    }

    return files;
}
