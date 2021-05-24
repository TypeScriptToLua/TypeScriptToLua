import { func2 } from "../otherfile2";

export function nestedFunc() {
    return "nested func result";
}

export function nestedFuncUsingParent() {
    return `nested func: ${func2()}`;
}
