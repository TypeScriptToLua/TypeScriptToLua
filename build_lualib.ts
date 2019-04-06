import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as ts from "typescript";
import * as tstl from "./src";
import { LuaLib } from "./src/LuaLib";

const options: tstl.CompilerOptions = {
    skipLibCheck: true,
    types: [],
    luaLibImport: tstl.LuaLibImportKind.None,
    luaTarget: tstl.LuaTarget.Lua51,
    noHeader: true,
    outDir: path.join(__dirname, "./dist/lualib"),
    rootDir: path.join(__dirname, "./src/lualib"),
};

// TODO: Check diagnostics
const { transpiledFiles } = tstl.transpileFiles(glob.sync("./src/lualib/**/*.ts"), options);
const emitResult = tstl.emitTranspiledFiles(options, transpiledFiles);
emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));

const bundlePath = path.join(__dirname, "./dist/lualib/lualib_bundle.lua");
if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
}

fs.writeFileSync(
    bundlePath,
    LuaLib.loadFeatures(Object.keys(tstl.LuaLibFeature).map(lib => tstl.LuaLibFeature[lib])),
);
