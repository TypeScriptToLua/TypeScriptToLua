import { dependency1IndexFunc } from "dependency1";
import { dependency1OtherFileFunc } from "dependency1/d1otherfile";
import { dependency2Main, dependency2OtherFileFunc } from "dependency2/main";

export const dependency1IndexResult = dependency1IndexFunc();
export const dependency1OtherFileFuncResult = dependency1OtherFileFunc();
export const dependency2MainResult = dependency2Main();
export const dependency2OtherFileResult = dependency2OtherFileFunc("my string argument");
