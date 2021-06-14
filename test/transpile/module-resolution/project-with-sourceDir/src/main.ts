import * as dependency1 from "dependency1";
import { func, nestedFunc } from "./subdir/otherfile";
import { nestedFunc as nestedFuncOriginal, nestedFuncUsingParent } from "./subdir/subdirofsubdir/nestedfile";

export const result = dependency1.f1();
export const functionInSubDir = func();
export const functionReExportedFromSubDir = nestedFunc();
export const nestedFunctionInSubDirOfSubDir = nestedFuncOriginal();
export const nestedFunctionUsingFunctionFromParentDir = nestedFuncUsingParent();
