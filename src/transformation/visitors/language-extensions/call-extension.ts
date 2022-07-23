import { TransformationContext } from "../../context";
import * as ts from "typescript";
import { ExtensionKind, getExtensionKindForNode } from "../../utils/language-extensions";
import * as lua from "../../../LuaAST";
import { operatorExtensionTransformers } from "./operators";
import { tableExtensionTransformers, tableNewExtensions } from "./table";

const allCallExtensionHandlers: LanguageExtensionCallTransformerMap = {
    ...operatorExtensionTransformers,
    ...tableExtensionTransformers,
};
export const callExtensions = new Set(Object.keys(allCallExtensionHandlers) as ExtensionKind[]);
tableNewExtensions.forEach(kind => callExtensions.add(kind));

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
    node: ts.CallExpression
): lua.Expression | undefined {
    const extensionKind = getExtensionKindForNode(context, node.expression);
    if (!extensionKind) return;
    const transformer = allCallExtensionHandlers[extensionKind];
    if (transformer) {
        return transformer(context, node, extensionKind);
    }
}
