import * as fs from "fs";
import * as path from "path";
import { CompilerOptions, LuaLibImportKind } from "./CompilerOptions";
import { TranspiledFile } from "./Transpile";

const trimExt = (filePath: string) => filePath.slice(0, -path.extname(filePath).length);
const normalizeSlashes = (filePath: string) => filePath.replace(/\\/g, "/");

export interface OutputFile {
    name: string;
    text: string;
}

let lualibContent: string;
export function emitTranspiledFiles(options: CompilerOptions, transpiledFiles: TranspiledFile[]): OutputFile[] {
    let { rootDir, outDir, outFile, luaLibImport } = options;

    const configFileName = options.configFilePath as string | undefined;
    // TODO: Use getCommonSourceDirectory
    const baseDir = configFileName ? path.dirname(configFileName) : process.cwd();

    rootDir = rootDir || baseDir;
    outDir = outDir ? path.resolve(baseDir, outDir) : rootDir;

    const files: OutputFile[] = [];
    for (const { fileName, lua, sourceMap, declaration, declarationMap } of transpiledFiles) {
        let outPath = fileName;
        if (outDir !== rootDir) {
            outPath = path.resolve(outDir, path.relative(rootDir, fileName));
        }

        // change extension or rename to outFile
        if (outFile) {
            outPath = path.isAbsolute(outFile) ? outFile : path.resolve(baseDir, outFile);
        } else {
            outPath = trimExt(outPath) + ".lua";
        }

        outPath = normalizeSlashes(outPath);

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
            lualibContent = fs.readFileSync(path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"), "utf8");
        }

        let outPath = path.resolve(rootDir, "lualib_bundle.lua");
        if (outDir !== rootDir) {
            outPath = path.join(outDir, path.relative(rootDir, outPath));
        }

        files.push({ name: normalizeSlashes(outPath), text: lualibContent });
    }

    return files;
}
