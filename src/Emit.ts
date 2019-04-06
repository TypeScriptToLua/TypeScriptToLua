import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, LuaLibImportKind } from "./CompilerOptions";
import { TranspiledFile } from "./Transpile";

const trimExt = (filePath: string) =>
    path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));

let lualibContent: string;
export function emitTranspiledFiles(
    options: CompilerOptions,
    transpiledFiles: Map<string, TranspiledFile>,
    writeFile = ts.sys.writeFile
): void {
    const { rootDir, outDir, outFile, luaLibImport } = options;

    for (const [fileName, { lua, sourceMap, declaration, declarationMap }] of transpiledFiles) {
        let outPath = fileName;
        if (outDir !== rootDir) {
            const relativeSourcePath = path.resolve(fileName).replace(path.resolve(rootDir), "");
            outPath = path.join(outDir, relativeSourcePath);
        }

        // change extension or rename to outFile
        if (outFile) {
            if (path.isAbsolute(outFile)) {
                outPath = outFile;
            } else {
                // append to workingDir or outDir
                outPath = path.resolve(options.outDir, outFile);
            }
        } else {
            outPath = trimExt(outPath) + ".lua";
        }

        if (lua !== undefined) {
            writeFile(outPath, lua);
        }

        if (sourceMap !== undefined && options.sourceMap) {
            writeFile(outPath + ".map", sourceMap);
        }

        if (declaration !== undefined) {
            writeFile(trimExt(outPath) + ".d.ts", declaration);
        }

        if (declarationMap !== undefined) {
            writeFile(trimExt(outPath) + ".d.ts.map", declarationMap);
        }
    }

    if (luaLibImport === LuaLibImportKind.Require || luaLibImport === LuaLibImportKind.Always) {
        if (lualibContent === undefined) {
            lualibContent = fs.readFileSync(
                path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"),
                "utf8"
            );
        }

        const outPath = path.join(outDir, "lualib_bundle.lua");
        writeFile(outPath, lualibContent);
    }
}
