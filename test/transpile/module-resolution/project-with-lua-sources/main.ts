import { funcInLuaFile } from "./luafile";
import { funcFromSubDir } from "./lua_sources/otherluaFile";

export const funcFromLuaFile = funcInLuaFile();
export const funcFromSubDirLuaFile = funcFromSubDir();
