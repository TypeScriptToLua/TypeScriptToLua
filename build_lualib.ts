import concat = require("concat");
import * as glob from "glob";
import {compile} from "./src/Compiler";

compile([
    "--luaLibImport",
    "none",
    "--luaTarget",
    "5.1",
    "--outDir",
    "./dist/lualib",
    "--rootDir",
    "./src/lualib",
    ...glob.sync("./src/lualib/*.ts"),
  ]);

concat(glob.sync("./dist/lualib/*.lua"), "./dist/lualib/lualib_bundle.lua");
