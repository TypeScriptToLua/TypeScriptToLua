import { TransformationContext } from "../../context";
import * as ts from "typescript";
import { ExtensionKind, getExtensionKindForNode } from "../../utils/language-extensions";
import * as lua from "../../../LuaAST";
import { unsupportedBuiltinOptionalCall } from "../../utils/diagnostics";
import { operatorExtensionTransformers } from "./operators";
import { tableExtensionTransformers } from "./table";

export const allCallExtensionHandlers: LanguageExtensionCallTransformerMap = {
    ...operatorExtensionTransformers,
    ...tableExtensionTransformers,
};
export type LanguageExtensionCallTransformer = (
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
) => lua.Expression;

export type LanguageExtensionCallTransformerMap = {
    [P in ExtensionKind]?: LanguageExtensionCallTransformer;
};
export function transformLanguageExtensionCallExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    isOptionalCall: boolean
): lua.Expression | undefined {
    const extensionKind = getExtensionKindForNode(context, node.expression);
    if (!extensionKind) return;
    const handler = allCallExtensionHandlers[extensionKind];
    if (!handler) return;
    if (isOptionalCall) {
        context.diagnostics.push(unsupportedBuiltinOptionalCall(node));
        return lua.createNilLiteral();
    }
    return handler(context, node, extensionKind);
}
