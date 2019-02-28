import * as fs from "fs";
import * as glob from "glob";
import {compile} from "./src/Compiler";
import {LuaLib as luaLib, LuaLibFeature} from "./src/LuaLib";

const bundlePath = "./dist/lualib/lualib_bundle.lua";

compile([
    "--luaLibImport",
    "none",
    "--luaTarget",
    "5.1",
    "--noHeader",
    "--outDir",
    "./dist/lualib",
    "--rootDir",
    "./src/lualib",
    "--noHeader",
    "true",
    ...glob.sync("./src/lualib/*.ts"),
]);

if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
}

const bundle = luaLib.loadFeatures(Object.keys(LuaLibFeature).map(lib => LuaLibFeature[lib]));
fs.writeFileSync(bundlePath, bundle);
