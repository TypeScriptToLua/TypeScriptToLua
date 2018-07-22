import concat = require("concat");
import * as glob from "glob";
import {compile} from "./src/Compiler";
import * as fs from "fs";

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

fs.unlinkSync(bundlePath);

concat(glob.sync("./dist/lualib/*.lua"), bundlePath);
