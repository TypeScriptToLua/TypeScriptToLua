import { TransformationContext } from "../context";
import * as ts from "typescript";
import { isStandardLibraryType } from "../utils/typescript";

const errorClasses = new Set([
    "Error",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
]);

export function isErrorClass(context: TransformationContext, node: ts.Identifier) {
    const type = context.checker.getTypeAtLocation(node);
    return isStandardLibraryType(context, type, undefined) && errorClasses.has(node.text);
}
