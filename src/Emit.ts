import * as fs from "fs";
import * as path from "path";
import { CompilerOptions, LuaLibImportKind } from "./CompilerOptions";
import { TranspiledFile } from "./Transpile";

const trimExt = (filePath: string) =>
    path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));

export interface OutputFile {
    name: string;
    text: string;
}

let lualibContent: string;
export function emitTranspiledFiles(
    options: CompilerOptions,
    transpiledFiles: Map<string, TranspiledFile>
): OutputFile[] {
    let { rootDir, outDir, outFile, luaLibImport } = options;

    // TODO:
    const configFileName = options.configFilePath as string | undefined;
    if (configFileName && rootDir === undefined) rootDir = path.dirname(configFileName);
    if (rootDir === undefined) rootDir = process.cwd();
    if (outDir === undefined) outDir = rootDir;

    const files: OutputFile[] = [];
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
                outPath = path.resolve(outDir, outFile);
            }
        } else {
            outPath = trimExt(outPath) + ".lua";
        }

        if (lua !== undefined) {
            files.push({ name: outPath, text: lua });
        }

        if (sourceMap !== undefined && options.sourceMap) {
            files.push({ name: outPath + ".map", text: sourceMap });
        }

        if (declaration !== undefined) {
            files.push({ name: trimExt(outPath) + ".d.ts", text: declaration });
        }

        if (declarationMap !== undefined) {
            files.push({ name: trimExt(outPath) + ".d.ts.map", text: declarationMap });
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
        files.push({ name: outPath, text: lualibContent });
    }

    return files;
}
