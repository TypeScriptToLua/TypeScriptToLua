import { dependency1OtherFileFunc } from "./d1otherfile";

export function dependency1IndexFunc() {
    return "function in dependency 1 index: " + dependency1OtherFileFunc();
}
