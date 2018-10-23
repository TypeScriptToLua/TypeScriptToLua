import * as fs from "fs";
import * as glob from "glob";
import {compile} from "./src/Compiler";

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
    ...glob.sync("./src/lualib/*.ts"),
  ]);

if (fs.existsSync(bundlePath)) {
  fs.unlinkSync(bundlePath);
}

let bundle = "";

glob.sync("./dist/lualib/*.lua").forEach(fileName => bundle += fs.readFileSync(fileName));

fs.writeFileSync(bundlePath, bundle);
