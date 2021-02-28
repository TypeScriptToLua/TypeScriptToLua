import * as ts from "typescript";
import { TransformationContext } from "../../context";
import * as extensions from "../../utils/language-extensions";

export function isVarargConstantNode(context: TransformationContext, node: ts.Node): boolean {
    const symbol = context.checker.getSymbolAtLocation(node);
    return symbol ? extensions.isExtensionValue(context, symbol, extensions.ExtensionKind.VarargConstant) : false;
}
