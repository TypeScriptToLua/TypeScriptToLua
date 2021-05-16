import * as dependency1 from "dependency1";
import { func } from "./subdir/otherfile";

export const result = dependency1.f1();
export const result2 = func();