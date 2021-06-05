import { funcInLuaFile } from "./LUAFILE";
import { funcInSubdir } from "./subdir/subdirfile";

export const funcFromLuaFile = funcInLuaFile();
export const funcFromSubDirFile = funcInSubdir();
