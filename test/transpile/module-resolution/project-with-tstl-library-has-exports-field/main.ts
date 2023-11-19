import { dependency1IndexFunc } from "dependency1/sub";
import { dependency1OtherFileFunc } from "dependency1/sub/d1otherfile";

export const dependency1IndexResult = dependency1IndexFunc();
export const dependency1OtherFileFuncResult = dependency1OtherFileFunc();
