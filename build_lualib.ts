import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as ts from "typescript";
import * as tstl from "./src";
import { LuaLib } from "./src/LuaLib";

const options: tstl.CompilerOptions = {
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts"],

    outDir: path.join(__dirname, "./dist/lualib"),
    rootDir: path.join(__dirname, "./src/lualib"),

    luaLibImport: tstl.LuaLibImportKind.None,
    luaTarget: tstl.LuaTarget.Lua51,
    noHeader: true,
};

// TODO: Check diagnostics
const { emitResult } = tstl.transpileFiles(glob.sync("./src/lualib/**/*.ts"), options);
emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));

const bundlePath = path.join(__dirname, "./dist/lualib/lualib_bundle.lua");
if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
}

fs.writeFileSync(bundlePath, LuaLib.loadFeatures(Object.values(tstl.LuaLibFeature)));
